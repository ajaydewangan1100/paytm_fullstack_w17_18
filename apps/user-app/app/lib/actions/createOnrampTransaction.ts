"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

export async function creaOnRampTransaction(amount: number, provider: string) {
  const session = await getServerSession(authOptions);
  // token will come from banking server, we are generating by our self to store on db
  const token = Math.random().toString();

  const userId = session?.user?.id;

  if (!userId) {
    return {
      success: false,
      message: "User not loggedin!!!",
    };
  }

  const onRampTransaction = await prisma.onRampTransaction.create({
    data: {
      userId: Number(userId),
      amount,
      provider,
      status: "Processing",
      token: token,
      startTime: new Date(),
    },
  });

  return {
    success: true,
    message: "On ramp transaction aded successfully",
  };
}
