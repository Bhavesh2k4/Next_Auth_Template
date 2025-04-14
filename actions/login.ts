"use server"
import * as z from 'zod';
import { LoginSchema } from "@/schema";
import { signIn } from '@/auth';
import { DEFAULT_LOGIN_USER_REDIRECT } from '@/routes';
import { AuthError } from 'next-auth';
import { generateVerificationToken } from '@/lib/tokens';
import { getUserByEmail } from '@/data/user';
import {sendVerificationEmail} from '@/lib/mail';

export const login = async (values:z.infer<typeof LoginSchema>) => {
  const validatedValues = LoginSchema.safeParse(values)

  if (!validatedValues.success) {
    return {
        error:"Invalid Credentials",
    };
  }
  const {email, password} = validatedValues.data;
  const existingUser = await getUserByEmail(email);
  if (!existingUser || !existingUser.email || !existingUser.password) {
    return {
        error:"Email not registered",
    };
  }
  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(existingUser.email)
    await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token
    )
    return {
        success:"Verification email sent",
    };
  }

  try{
    await signIn('credentials', {
        email: email.toLowerCase(),
        password: password,
        redirectTo : DEFAULT_LOGIN_USER_REDIRECT,
    })
  }
  catch(error){
    if(error instanceof AuthError){
        switch(error.type){
          case "CredentialsSignin":
            return {
              error:"Invalid Credentials",
            };
          default:
            return {
              error:"Something went wrong",
            };
        }
    }
  throw error;
  }

}