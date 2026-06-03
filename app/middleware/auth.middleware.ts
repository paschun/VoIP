import { jwtVerify } from 'jose'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.ts'

const joseSecret = new TextEncoder().encode(env.COOKIE_KEY);

// The JWT payload this middleware verifies and attaches to every authenticated request as `req.user`.
export interface AuthUser {
    id: string
    email: string
    name: string
}

declare global {
    namespace Express {
        interface Request {
            user: AuthUser
        }
    }
}

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        if(req.headers.token){
            const token = req.headers.token as string;
                    try {
                        const { payload } = await jwtVerify(token, joseSecret);
                        req.user = payload as unknown as AuthUser;
                        next();
                      } catch(err) {
                        res.status(401).json({
                            error: 'Unauthorized Access!'
                        });
                      }
                    
        }else{
            res.status(401).json({
                error: 'Unauthorized Access!'
            });
        }
    } catch (e) {
      res.status(401).json({
        error: 'Unauthorized Access!'
      });
    }
};
