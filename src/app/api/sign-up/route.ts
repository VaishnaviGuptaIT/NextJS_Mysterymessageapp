import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { send } from "process";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import { request } from "http";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { username, email, password } = await request.json();
    const existngUserVerifiedByUsername = await UserModel.findOne({
      username,
      isVerified: true,
    });
    if (existngUserVerifiedByUsername) {
      return Response.json(
        {
          success: false,
          message: "User already exists",
        },
        {
          status: 400,
        }
      );
    }
    const existingUserByEmail = await UserModel.findOne({
      email,
    });
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: "User already exist with this email ",
          },
          {
            status: 400,
          }
        );
      }
      else {
          const hashedPassword = await bcrypt.hash(password, 10)
          existingUserByEmail.password = hashedPassword;
          existingUserByEmail.verifyCode = verifyCode;
          existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000)
          await existingUserByEmail.save()
        }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const newUser = new UserModel({
        username,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
        isAcceptingMessage: true,
        messages: [],
      });

      await newUser.save();
    }
    // send verification email
    const emailResponse = await sendVerificationEmail(
      email,
      username,
      verifyCode
    );
    if (!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message,
        },
        { status: 500 }
      );
    }
    return Response.json(
      {
        success: true,
        message: "User registered successfully, Please verify your email",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error regsistering user", error);
    return Response.json(
      {
        success: false,
        message: "Error registering user",
      },
      {
        status: 500,
      }
    );
  }

  // const body = await req.json();
  // const { username, email, password } = body;
  // const userExists = await UserModel.findOne({ email });
  // if (userExists) {
  //     return new Response(JSON.stringify({ message: "User already exists" }), {
  //         status: 409,
  //     });
  // }
  // const hashedPassword = await bcrypt.hash(password, 10);
  // const user = await UserModel.create({
  //     username,
  //     email,
  //     password: hashedPassword,
  // });
  // const verificationCode = Math.floor(Math.random() * 1000000).toString();
  // const verificationEmailResponse = await sendVerificationEmail(
  //     username,
  //     email,
  //     verificationCode
  // );
  // if (verificationEmailResponse.success) {
  //     user.verifyCode = verificationCode;
  //     user.verifyCodeExpiry = new Date(Date.now() + 5 * 60 * 1000);
  //     await user.save();
  // }
  // return new Response(JSON.stringify({ message: "User created successfully" }), {
  //     status: 201,
  // });
}
