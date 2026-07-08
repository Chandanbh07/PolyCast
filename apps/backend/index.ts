import express from "express";
import http from "http";
import { uuid } from "uuidv4";
import cors from "cors";
import path from "path";
import { middleware } from "./middleware";
import { prisma } from "db";
import { CreateOrderSchema, SplitSchema, OnrampSchema, OfframpSchema, CreateCommentSchema, type Orderbook } from "./types";
import { attachRealtime, broadcast } from "./realtime";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json())

app.use(cors());

// Recomputes the lightweight "market stats" trio (volume / liquidity / traders)
// so both the REST endpoint and the websocket push use identical logic.
async function computeMarketStats(marketId: string) {
    const market = await prisma.market.findFirst({ where: { id: marketId } });
    if (!market) return null;

    const yesBook = parseOrderbook(market.yesOrderbook);
    const noBook = parseOrderbook(market.noOrderbook);

    let liquidityCents = 0;
    for (const book of [yesBook, noBook]) {
        for (const [price, level] of Object.entries(book)) {
            liquidityCents += Number(price) * level.availableQty;
        }
    }

    const traderRows = await prisma.position.findMany({
        where: { marketId, qty: { gt: 0 } },
        select: { userId: true },
        distinct: ["userId"],
    });

    return {
        volume: market.totalQty,
        liquidity: liquidityCents / 100,
        traders: traderRows.length,
    };
}

async function pushMarketUpdate(marketId: string) {
    const [market, stats] = await Promise.all([
        prisma.market.findFirst({ where: { id: marketId } }),
        computeMarketStats(marketId),
    ]);
    if (market) {
        broadcast(marketId, { type: "orderbook", market });
    }
    if (stats) {
        broadcast(marketId, { type: "stats", stats });
    }
}

function parseOrderbook(orderbook: unknown): Orderbook {
    if (typeof orderbook === "string") {
        return JSON.parse(orderbook);
    }
    if (orderbook && typeof orderbook === "object") {
        return orderbook as Orderbook;
    }
    return {};
}

// Get all markets
app.get("/markets", async (req, res) => {
    const markets = await prisma.market.findMany();
    res.json({
        markets
    });
});

app.post("/order", middleware, async (req, res) => {
    const { success, data } = CreateOrderSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs"
        })
        return;
    }

    const originalOrderId = uuid();

    try {
        await prisma.$transaction(async tx => {
            const response = await tx.$queryRaw<{ yesOrderbook: unknown, noOrderbook: unknown, id: string, totalQty: number }[]>`SELECT * FROM "Market" WHERE id=${data.marketId} FOR UPDATE;`;
            const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;

            const user = userResponse[0];
            if (!user) {
                throw new Error("User not found");
            }
            const market = response[0];
            if (!market) {
                throw new Error("Market not found");
            }

            const yesOrderbook = parseOrderbook(market.yesOrderbook);
            const noOrderbook = parseOrderbook(market.noOrderbook);

            if (data.side == "yes" && data.type == "buy") {
                const usd = data.qty * data.price;
                if (user.usdBalance < usd) {
                    throw new Error("Insufficient USD balance");
                }

                let leftQty = data.qty;

                const prices = Object.keys(yesOrderbook).sort((a: string, b: string) => Number(a) - Number(b));

                for (const price of prices) {
                    if (Number(price) > data.price) {
                        continue;
                    }
                    const { orders } = yesOrderbook[price]!;

                    for (const order of orders) {
                        if (leftQty <= 0) break;

                        const matchedQty = order.qty >= leftQty ? leftQty : order.qty;
                        const reverseOrder = order.reverseOrder;
                        if (!reverseOrder) {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "Yes"
                                    }
                                },
                                data: {
                                    qty: {
                                        decrement: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        increment: Number(price) * matchedQty
                                    }
                                }
                            })
                        } else {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "No"
                                    }
                                },
                                data: {
                                    qty: {
                                        increment: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        decrement: (100 - Number(price)) * matchedQty
                                    }
                                }
                            })
                        }
                        await tx.position.upsert({
                            where: {
                                userId_marketId_type: {
                                    userId,
                                    marketId: data.marketId,
                                    type: "Yes"
                                }
                            },
                            update: {
                                qty: {
                                    increment: matchedQty
                                }
                            },
                            create: {
                                userId,
                                marketId: data.marketId,
                                type: "Yes",
                                qty: matchedQty
                            }
                        })

                        await tx.user.update({
                            where: {
                                id: userId
                            },
                            data: {
                                usdBalance: {
                                    decrement: Number(price) * matchedQty
                                }
                            }
                        })

                        leftQty -= matchedQty;
                        order.filledQty += matchedQty;
                        yesOrderbook[price]!.availableQty -= matchedQty;
                    }
                }

                // if (leftQty > 0) {
                //     const oppositePrice = 100 - data.price;
                //     if (!noOrderbook[oppositePrice]) {
                //         noOrderbook[oppositePrice] = { availableQty: 0, orders: [] };
                //     }

                //     noOrderbook[oppositePrice]!.availableQty += leftQty;
                //     noOrderbook[oppositePrice]!.orders.push({qty: leftQty, userId, filledQty: 0, originalOrderId, reverseOrder: true});   
                // }

                if (leftQty > 0) {
                    await tx.user.update({
                        where: { id: userId },
                        data: {
                            usdBalance: {
                                decrement: leftQty * data.price
                            }
                        }
                    });

                    await tx.position.upsert({
                        where: {
                            userId_marketId_type: {
                                userId,
                                marketId: data.marketId,
                                type: "Yes"
                            }
                        },
                        update: {
                            qty: {
                                increment: leftQty
                            }
                        },
                        create: {
                            userId,
                            marketId: data.marketId,
                            type: "Yes",
                            qty: leftQty
                        }
                    });

                    const oppositePrice = 100 - data.price;

                    if (!noOrderbook[oppositePrice]) {
                        noOrderbook[oppositePrice] = {
                            availableQty: 0,
                            orders: []
                        };
                    }

                    noOrderbook[oppositePrice]!.availableQty += leftQty;
                    noOrderbook[oppositePrice]!.orders.push({
                        qty: leftQty,
                        userId,
                        filledQty: 0,
                        originalOrderId,
                        reverseOrder: true
                    });
                }
            }

            if (data.side == "yes" && data.type == "sell") {
                const buyPrice = 100 - data.price;

                const userPosition = await tx.position.findFirst({
                    where: {
                        userId: userId,
                        marketId: data.marketId,
                        type: "Yes"
                    }
                });

                if (!userPosition || userPosition.qty < data.qty) {
                    throw new Error("Insufficient Yes position");
                }

                let leftQty = data.qty;

                const prices = Object.keys(noOrderbook).sort((a: string, b: string) => Number(a) - Number(b));

                for (const price of prices) {
                    if (Number(price) > buyPrice) {
                        continue;
                    }
                    const { orders } = noOrderbook[price]!;

                    for (const order of orders) {
                        if (leftQty <= 0) break;

                        const matchedQty = order.qty >= leftQty ? leftQty : order.qty;
                        const reverseOrder = order.reverseOrder;
                        if (!reverseOrder) {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "No"
                                    }
                                },
                                data: {
                                    qty: {
                                        decrement: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        increment: Number(price) * matchedQty
                                    }
                                }
                            })
                        } else {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "Yes"
                                    }
                                },
                                data: {
                                    qty: {
                                        increment: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        decrement: (100 - Number(price)) * matchedQty
                                    }
                                }
                            })
                        }
                        await tx.position.update({
                            where: {
                                userId_marketId_type: {
                                    userId,
                                    marketId: data.marketId,
                                    type: "Yes"
                                }
                            },
                            data: {
                                qty: {
                                    decrement: matchedQty
                                }
                            },
                        })

                        await tx.user.update({
                            where: {
                                id: userId
                            },
                            data: {
                                usdBalance: {
                                    increment: Number(price) * matchedQty
                                }
                            }
                        })

                        leftQty -= matchedQty;
                        order.filledQty += matchedQty;
                        noOrderbook[price]!.availableQty -= matchedQty;
                    }
                }

                if (leftQty > 0) {
                    await tx.position.update({
                        where: {
                            userId_marketId_type: {
                                userId,
                                marketId: data.marketId,
                                type: "Yes"
                            }
                        },
                        data: {
                            qty: {
                                decrement: leftQty
                            }
                        }
                    });

                    if (!yesOrderbook[data.price]) {
                        yesOrderbook[data.price] = {
                            availableQty: 0,
                            orders: []
                        };
                    }

                    yesOrderbook[data.price]!.availableQty += leftQty;
                    yesOrderbook[data.price]!.orders.push({
                        qty: leftQty,
                        userId,
                        filledQty: 0,
                        originalOrderId,
                        reverseOrder: false
                    });
                }
            }

            if (data.side == "no" && data.type == "buy") {
                const usd = data.qty * data.price;
                if (user.usdBalance < usd) {
                    throw new Error("Insufficient USD balance");
                }

                let leftQty = data.qty;

                const prices = Object.keys(noOrderbook).sort((a: string, b: string) => Number(a) - Number(b));

                for (const price of prices) {
                    if (Number(price) > data.price) {
                        continue;
                    }
                    const { orders } = noOrderbook[price]!;

                    for (const order of orders) {
                        if (leftQty <= 0) break;

                        const matchedQty = order.qty >= leftQty ? leftQty : order.qty;
                        const reverseOrder = order.reverseOrder;
                        if (!reverseOrder) {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "No"
                                    }
                                },
                                data: {
                                    qty: {
                                        decrement: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        increment: Number(price) * matchedQty
                                    }
                                }
                            })
                        } else {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "Yes"
                                    }
                                },
                                data: {
                                    qty: {
                                        increment: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        decrement: (100 - Number(price)) * matchedQty
                                    }
                                }
                            })
                        }
                        await tx.position.upsert({
                            where: {
                                userId_marketId_type: {
                                    userId,
                                    marketId: data.marketId,
                                    type: "No"
                                }
                            },
                            update: {
                                qty: {
                                    increment: matchedQty
                                }
                            },
                            create: {
                                userId,
                                marketId: data.marketId,
                                type: "No",
                                qty: matchedQty
                            }
                        })

                        await tx.user.update({
                            where: {
                                id: userId
                            },
                            data: {
                                usdBalance: {
                                    decrement: Number(price) * matchedQty
                                }
                            }
                        })

                        leftQty -= matchedQty;
                        order.filledQty += matchedQty;
                        noOrderbook[price]!.availableQty -= matchedQty;
                    }
                }

                if (leftQty > 0) {
                    await tx.user.update({
                        where: {
                            id: userId
                        },
                        data: {
                            usdBalance: {
                                decrement: leftQty * data.price
                            }
                        }
                    });

                    await tx.position.upsert({
                        where: {
                            userId_marketId_type: {
                                userId,
                                marketId: data.marketId,
                                type: "No"
                            }
                        },
                        update: {
                            qty: {
                                increment: leftQty
                            }
                        },
                        create: {
                            userId,
                            marketId: data.marketId,
                            type: "No",
                            qty: leftQty
                        }
                    });

                    const oppositePrice = 100 - data.price;

                    if (!yesOrderbook[oppositePrice]) {
                        yesOrderbook[oppositePrice] = {
                            availableQty: 0,
                            orders: []
                        };
                    }

                    yesOrderbook[oppositePrice]!.availableQty += leftQty;
                    yesOrderbook[oppositePrice]!.orders.push({
                        qty: leftQty,
                        userId,
                        filledQty: 0,
                        originalOrderId,
                        reverseOrder: true
                    });
                }
            }

            if (data.side == "no" && data.type == "sell") {
                const buyPrice = 100 - data.price;

                const userPosition = await tx.position.findFirst({
                    where: {
                        userId: userId,
                        marketId: data.marketId,
                        type: "No"
                    }
                });

                if (!userPosition || userPosition.qty < data.qty) {
                    throw new Error("Insufficient No position");
                }

                let leftQty = data.qty;

                const prices = Object.keys(yesOrderbook).sort((a: string, b: string) => Number(a) - Number(b));

                for (const price of prices) {
                    if (Number(price) > buyPrice) {
                        if (leftQty > 0) continue;
                    }
                    const { orders } = yesOrderbook[price]!;

                    for (const order of orders) {
                        if (leftQty <= 0) break;

                        const matchedQty = order.qty >= leftQty ? leftQty : order.qty;
                        const reverseOrder = order.reverseOrder;
                        if (!reverseOrder) {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "Yes"
                                    }
                                },
                                data: {
                                    qty: {
                                        decrement: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        increment: Number(price) * matchedQty
                                    }
                                }
                            })
                        } else {
                            await tx.position.update({
                                where: {
                                    userId_marketId_type: {
                                        userId: order.userId,
                                        marketId: data.marketId,
                                        type: "No"
                                    }
                                },
                                data: {
                                    qty: {
                                        increment: matchedQty
                                    }
                                },
                            })
                            await tx.user.update({
                                where: {
                                    id: order.userId
                                },
                                data: {
                                    usdBalance: {
                                        decrement: (100 - Number(price)) * matchedQty
                                    }
                                }
                            })
                        }
                        await tx.position.update({
                            where: {
                                userId_marketId_type: {
                                    userId,
                                    marketId: data.marketId,
                                    type: "No"
                                }
                            },
                            data: {
                                qty: {
                                    decrement: matchedQty
                                }
                            },
                        })

                        await tx.user.update({
                            where: {
                                id: userId
                            },
                            data: {
                                usdBalance: {
                                    increment: Number(price) * matchedQty
                                }
                            }
                        })

                        leftQty -= matchedQty;
                        order.filledQty += matchedQty;
                        yesOrderbook[price]!.availableQty -= matchedQty;
                    }
                }

                if (leftQty > 0) {
                    await tx.position.update({
                        where: {
                            userId_marketId_type: {
                                userId,
                                marketId: data.marketId,
                                type: "No"
                            }
                        },
                        data: {
                            qty: {
                                decrement: leftQty
                            }
                        }
                    });

                    if (!noOrderbook[data.price]) {
                        noOrderbook[data.price] = {
                            availableQty: 0,
                            orders: []
                        };
                    }

                    noOrderbook[data.price]!.availableQty += leftQty;
                    noOrderbook[data.price]!.orders.push({
                        qty: leftQty,
                        userId,
                        filledQty: 0,
                        originalOrderId,
                        reverseOrder: false
                    });
                }
            }

            await tx.orderHistory.create({
                data: {
                    id: originalOrderId,
                    orderType: data.type === "buy" ? "Buy" : "Sell",
                    side: data.side === "yes" ? "Yes" : "No",
                    userId,
                    price: data.price,
                    qty: data.qty,
                    marketId: data.marketId
                }
            })

            await tx.market.update({
                where: {
                    id: data.marketId
                },
                data: {
                    yesOrderbook: JSON.stringify(yesOrderbook),
                    noOrderbook: JSON.stringify(noOrderbook),
                    totalQty: {
                        increment: data.qty
                    }
                }
            })
        })

        // Fire-and-forget: push the fresh orderbook/stats and the new trade to
        // every client currently watching this market. Response to the trader
        // below does not wait on this.
        pushMarketUpdate(data.marketId).catch((e) => console.error("broadcast error:", e));
        broadcast(data.marketId, {
            type: "trade",
            trade: {
                id: originalOrderId,
                orderType: data.type === "buy" ? "Buy" : "Sell",
                side: data.side === "yes" ? "Yes" : "No",
                price: data.price,
                qty: data.qty,
                createdAt: new Date().toISOString(),
            },
        });

        res.json({
            message: "Order executed successfully"
        })
    } catch (error: any) {
        console.error("Error executing order:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "Sorry you dont have enough $ in your account"
            })
        } else if (error.message === "Insufficient Yes position" || error.message === "Insufficient No position") {
            res.status(403).json({
                message: "Sorry you dont have enough position"
            })
        } else {
            res.status(500).json({
                message: "Error executing order"
            })
        }
    }
})

app.get("/market", async (req, res) => {
    const market = await prisma.market.findFirst({
        where: {
            id: req.query.marketId as string
        }
    });

    res.json({
        market
    })
})

app.post("/split", middleware, async (req, res) => {
    const { data, success } = SplitSchema.safeParse(req.body);
    const userId: string = req.userId;
    if (!success) {
        res.status(411).json({ message: "Incorrect inputs" });
        return
    }
    const marketId = data?.marketId;

    try {
    await prisma.$transaction(async tx => {
        const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
        const user = userResponse[0];
        if (!user) {
            throw new Error("User not found");
        }

        if (user.usdBalance < data.amount) {
            throw new Error("Insufficient USD balance");
        }

        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                usdBalance: {
                    decrement: data.amount
                }
            }
        })

        await tx.position.upsert({
            where: {
                userId_marketId_type: {
                    marketId,
                    userId,
                    type: "Yes"
                }
            },
            create: {
                marketId,
                userId,
                type: "Yes",
                qty: data.amount
            },
            update: {
                qty: {
                    increment: data.amount
                }
            }

        })

        await tx.position.upsert({
            where: {
                userId_marketId_type: {
                    marketId,
                    userId,
                    type: "No"
                }
            },
            create: {
                marketId,
                userId,
                type: "No",
                qty: data.amount
            },
            update: {
                qty: {
                    increment: data.amount
                }
            }

        })

        await tx.orderHistory.create({
            data: {
                orderType: "Split",
                userId,
                price: 0,
                qty: data.amount,
                marketId: data.marketId
            }
        })
    })

        pushMarketUpdate(data.marketId).catch((e) => console.error("broadcast error:", e));
        res.json({
            message: "Split successful"
        })
    } catch (error: any) {
        console.error("Error splitting:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "sorry you are not allowed to do this"
            })
        } else {
            res.status(500).json({
                message: "Error splitting"
            })
        }
    }
})

app.post("/merge", middleware, async (req, res) => {
    const { data, success } = SplitSchema.safeParse(req.body);
    const userId: string = req.userId;
    if (!success) {
        res.status(411).json({ message: "Incorrect inputs" });
        return
    }
    const marketId = data?.marketId;

    try {
        await prisma.$transaction(async tx => {
            const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
            const user = userResponse[0];
            if (!user) {
                throw new Error("User not found");
            }

            const yesPosition = await tx.position.findFirst({
                where: {
                    userId,
                    marketId,
                    type: "Yes"
                }
            });

            const noPosition = await tx.position.findFirst({
                where: {
                    userId,
                    marketId,
                    type: "No"
                }
            });

            if (!yesPosition || yesPosition.qty < data.amount) {
                throw new Error("Insufficient Yes position");
            }

            if (!noPosition || noPosition.qty < data.amount) {
                throw new Error("Insufficient No position");
            }

            await tx.position.update({
                where: {
                    userId_marketId_type: {
                        userId,
                        marketId,
                        type: "Yes"
                    }
                },
                data: {
                    qty: {
                        decrement: data.amount
                    }
                }
            })

            await tx.position.update({
                where: {
                    userId_marketId_type: {
                        userId,
                        marketId,
                        type: "No"
                    }
                },
                data: {
                    qty: {
                        decrement: data.amount
                    }
                }
            })

            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    usdBalance: {
                        increment: data.amount
                    }
                }
            })

            await tx.orderHistory.create({
                data: {
                    orderType: "Merge",
                    userId,
                    price: 0,
                    qty: data.amount,
                    marketId: data.marketId
                }
            })
        })
        pushMarketUpdate(data.marketId).catch((e) => console.error("broadcast error:", e));
        res.json({
            message: "Merge successful"
        })
    } catch (error: any) {
        console.error("Error merging:", error);
        if (error.message === "Insufficient Yes position" || error.message === "Insufficient No position") {
            res.status(403).json({
                message: "Sorry you dont have enough position"
            })
        } else {
            res.status(500).json({
                message: "Error merging"
            })
        }
    }
})

app.get("/balance", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const user = await prisma.user.findFirst({
        where: {
            id: userId
        }
    })

    res.json({
        balance: user?.usdBalance
    })
})

app.get("/positions", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const positions = await prisma.position.findMany({
        where: {
            userId
        }
    })

    res.json({
        positions
    })
})

// Recent trades feed for a single market — used to render the "Recent trades"
// list on the market page and to seed the price chart.
app.get("/trades", async (req, res) => {
    const marketId = req.query.marketId as string;
    if (!marketId) {
        res.status(400).json({ message: "marketId is required" });
        return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const trades = await prisma.orderHistory.findMany({
        where: {
            marketId,
            orderType: { in: ["Buy", "Sell"] }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            orderType: true,
            side: true,
            price: true,
            qty: true,
            createdAt: true,
            userId: true
        }
    });

    res.json({ trades });
})

// Market statistics strip: total volume traded, dollar value of resting
// liquidity across both order books, and number of distinct traders holding
// a position in this market.
app.get("/stats", async (req, res) => {
    const marketId = req.query.marketId as string;
    if (!marketId) {
        res.status(400).json({ message: "marketId is required" });
        return;
    }

    const stats = await computeMarketStats(marketId);
    if (!stats) {
        res.status(404).json({ message: "Market not found" });
        return;
    }

    res.json({ stats });
})

// Leaderboard: ranks users by realized profit on resolved markets. For each
// resolved market, a correct share settles at 100c and an incorrect one at
// 0c; cost basis per user/market/side is the net cash they put in, taken
// from their own OrderHistory (sum of Buy fills minus Sell fills — the same
// records that already back /history and the price chart, so this is real
// derived data rather than a separate ledger that could drift from it).
app.get("/leaderboard", async (req, res) => {
    const resolvedMarkets = await prisma.market.findMany({
        where: { resolution: { not: null } },
        select: { id: true, resolution: true }
    });
    const resolvedIds = resolvedMarkets.map((m) => m.id);

    const users = await prisma.user.findMany({ select: { id: true, address: true } });

    // Net cash flow per user, keyed by `${marketId}:${side}` — positive
    // means net spent (long), used both as cost basis on resolved markets
    // and as total volume across all markets.
    const flows = new Map<string, Map<string, number>>(); // userId -> key -> cents
    const volumeByUser = new Map<string, number>(); // userId -> shares traded, all markets

    const allTrades = await prisma.orderHistory.findMany({
        where: { orderType: { in: ["Buy", "Sell"] } },
        select: { userId: true, marketId: true, side: true, price: true, qty: true, orderType: true }
    });

    for (const t of allTrades) {
        volumeByUser.set(t.userId, (volumeByUser.get(t.userId) ?? 0) + t.qty);

        if (!resolvedIds.includes(t.marketId)) continue;
        const key = `${t.marketId}:${t.side}`;
        const userFlows = flows.get(t.userId) ?? new Map<string, number>();
        const signedCents = (t.orderType === "Buy" ? 1 : -1) * t.price * t.qty;
        userFlows.set(key, (userFlows.get(key) ?? 0) + signedCents);
        flows.set(t.userId, userFlows);
    }

    const resolutionByMarket = new Map(resolvedMarkets.map((m) => [m.id, m.resolution]));
    const positions = await prisma.position.findMany({
        where: { marketId: { in: resolvedIds }, qty: { gt: 0 } },
        select: { userId: true, marketId: true, type: true, qty: true }
    });

    const payoutByUser = new Map<string, number>(); // cents
    const costByUser = new Map<string, number>(); // cents, resolved markets only
    const resolvedPositionCount = new Map<string, number>();
    const winningPositionCount = new Map<string, number>();

    for (const p of positions) {
        const resolution = resolutionByMarket.get(p.marketId);
        const payoutCents = p.type === resolution ? p.qty * 100 : 0;
        const key = `${p.marketId}:${p.type}`;
        const costCents = flows.get(p.userId)?.get(key) ?? 0;

        payoutByUser.set(p.userId, (payoutByUser.get(p.userId) ?? 0) + payoutCents);
        costByUser.set(p.userId, (costByUser.get(p.userId) ?? 0) + costCents);
        resolvedPositionCount.set(p.userId, (resolvedPositionCount.get(p.userId) ?? 0) + 1);
        if (payoutCents > costCents) {
            winningPositionCount.set(p.userId, (winningPositionCount.get(p.userId) ?? 0) + 1);
        }
    }

    const leaderboard = users
        .map((u) => {
            const payout = payoutByUser.get(u.id) ?? 0;
            const cost = costByUser.get(u.id) ?? 0;
            const resolvedCount = resolvedPositionCount.get(u.id) ?? 0;
            const wins = winningPositionCount.get(u.id) ?? 0;
            return {
                userId: u.id,
                address: u.address,
                profit: payout - cost, // cents
                volume: volumeByUser.get(u.id) ?? 0, // shares, all markets
                winRate: resolvedCount > 0 ? wins / resolvedCount : 0,
                roi: cost > 0 ? (payout - cost) / cost : 0,
                resolvedPositions: resolvedCount
            };
        })
        .filter((row) => row.volume > 0)
        .sort((a, b) => b.profit - a.profit);

    res.json({ leaderboard });
})

// Yes-probability-over-time series, derived from the executed order history.
// Each Buy/Sell record is converted into an implied Yes price (side === "No"
// trades are flipped to 100 - price) so the chart always plots probability
// of Yes resolving true.
app.get("/chart", async (req, res) => {
    const marketId = req.query.marketId as string;
    if (!marketId) {
        res.status(400).json({ message: "marketId is required" });
        return;
    }

    const trades = await prisma.orderHistory.findMany({
        where: {
            marketId,
            orderType: { in: ["Buy", "Sell"] }
        },
        orderBy: { createdAt: "asc" },
        select: { price: true, side: true, createdAt: true }
    });

    const points = trades.map((t) => ({
        time: t.createdAt,
        yesPrice: t.side === "No" ? 100 - t.price : t.price
    }));

    res.json({ points });
})

// A user's resting (unfilled or partially filled) orders across every
// market — anything still sitting in a yesOrderbook/noOrderbook level that
// belongs to them. This is derived on the fly from the order book JSON
// rather than a separate table, since that JSON is the actual source of
// truth for what is still "open" in the matching engine.
app.get("/orders", middleware, async (req, res) => {
    const userId: string = req.userId as string;

    const markets = await prisma.market.findMany({
        select: { id: true, title: true, yesOrderbook: true, noOrderbook: true, resolution: true }
    });

    const openOrders: {
        marketId: string;
        marketTitle: string;
        side: "Yes" | "No";
        price: number;
        qty: number;
        originalOrderId: string;
        auto: boolean;
    }[] = [];

    for (const market of markets) {
        if (market.resolution) continue;

        const books: [Orderbook, "Yes" | "No"][] = [
            [parseOrderbook(market.yesOrderbook), "Yes"],
            [parseOrderbook(market.noOrderbook), "No"]
        ];

        for (const [book, side] of books) {
            for (const [price, level] of Object.entries(book)) {
                for (const order of level.orders) {
                    if (order.userId !== userId) continue;
                    const remaining = order.qty - order.filledQty;
                    if (remaining <= 0) continue;
                    openOrders.push({
                        marketId: market.id,
                        marketTitle: market.title,
                        side,
                        price: Number(price),
                        qty: remaining,
                        originalOrderId: order.originalOrderId,
                        auto: order.reverseOrder
                    });
                }
            }
        }
    }

    res.json({ orders: openOrders });
})

app.post("/history", middleware, async (req, res) => {
    const userId: string = req.userId as string;
    const history = await prisma.orderHistory.findMany({
        where: {
            userId
        }
    })

    res.json({
        history
    })
})

// Comments feed for a market — public read, wallet-authenticated write. The
// address is joined in from the related User row so the frontend never has
// to make a second call to resolve who posted each comment.
app.get("/comments", async (req, res) => {
    const marketId = req.query.marketId as string;
    if (!marketId) {
        return res.status(400).json({ message: "marketId is required" });
    }

    const comments = await prisma.comment.findMany({
        where: { marketId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { address: true } } }
    });

    res.json({ comments });
})

app.post("/comments", middleware, async (req, res) => {
    const { success, data } = CreateCommentSchema.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ message: "Invalid comment payload" });
    }
    const userId: string = req.userId as string;

    const market = await prisma.market.findFirst({ where: { id: data.marketId } });
    if (!market) {
        return res.status(404).json({ message: "Market not found" });
    }

    const comment = await prisma.comment.create({
        data: {
            content: data.content,
            userId,
            marketId: data.marketId
        },
        include: { user: { select: { address: true } } }
    });

    res.json({ comment });
})

app.post("/onramp", middleware, async (req, res) => {
    const { success, data } = OnrampSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs"
        })
        return;
    }

    try {
        await prisma.$transaction(async tx => {
            const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
            const user = userResponse[0];
            if (!user) {
                throw new Error("User not found");
            }

            // Convert USD amount to cents (integer) for storage
            const amountInCents = Math.round(data.amount * 100);

            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    usdBalance: {
                        increment: amountInCents
                    }
                }
            });

        });

        res.json({
            message: "Onramp successful",
            amount: data.amount
        });
    } catch (error: any) {
        console.error("Error processing onramp:", error);
        res.status(500).json({
            message: "Error processing onramp"
        });
    }
});

app.post("/offramp", middleware, async (req, res) => {
    const { success, data } = OfframpSchema.safeParse(req.body);
    const userId: string = req.userId;

    if (!success) {
        res.status(411).json({
            message: "Incorrect inputs"
        })
        return;
    }

    try {
        await prisma.$transaction(async tx => {
            const userResponse = await tx.$queryRaw<{ id: string, address: string, usdBalance: number }[]>`SELECT * FROM "User" WHERE id=${userId} FOR UPDATE;`;
            const user = userResponse[0];
            if (!user) {
                throw new Error("User not found");
            }

            // Convert USD amount to cents (integer) for storage
            const amountInCents = Math.round(data.amount * 100);

            if (user.usdBalance < amountInCents) {
                throw new Error("Insufficient USD balance");
            }

            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    usdBalance: {
                        decrement: amountInCents
                    }
                }
            });

        });

        res.json({
            message: "Offramp successful",
            amount: data.amount
        });
    } catch (error: any) {
        console.error("Error processing offramp:", error);
        if (error.message === "Insufficient USD balance") {
            res.status(403).json({
                message: "Insufficient USD balance for offramp"
            });
        } else {
            res.status(500).json({
                message: "Error processing offramp"
            });
        }
    }
});

const server = http.createServer(app);
attachRealtime(server);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket realtime feed on ws://localhost:${PORT}/ws?marketId=<id>`);
});