import { z } from 'zod'; 

export const userRegisterSchema = z.object({
    userName: z.string(),
    userEmail: z.string().email(), 
    userPassword: z.string()
}); 

