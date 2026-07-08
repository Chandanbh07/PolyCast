
import { createClient } from "@supabase/supabase-js";
import { prisma } from "db";
import type { NextFunction, Request, Response } from "express";

const supabase = createClient(
  "https://vwnxadsxjzwaertdzfcc.supabase.co",
  process.env.SUPABASE_SECRET_KEY!
);

export async function middleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    console.log(user);
    console.log(error);

    if (!user || error) {
      return res.status(403).json({
        message: "Invalid token"
      });
    }
    const address = user?.user_metadata.custom_claims.address;
    const userDb = await prisma.user.upsert({
      where: {
        address,
      },
      update: {
        address,
      },
      create: {
        address,
        usdBalance: 0,
      }
    })
    if (address) {
      req.userId = userDb.id;
      next();
    } else {
      res.status(403).json({
        message: "Incorrect credentials"
      })
    }

  } catch (e) {
    return res.status(403).json({
      message: "Incorrect credentials",
    });
  }
}