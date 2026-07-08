declare module "cors" {
  const cors: any;
  export default cors;
}

declare namespace Express {
  interface Request {
    userId: string;
  }
}
