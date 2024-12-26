"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

export async function p2pTransfer(to: string, amount: number) {
  const session = await getServerSession(authOptions);
  const from = session?.user?.id;
  if (!from) {
    return {
      success: false,
      message: "Error while sending",
    };
  }
  const toUser = await prisma.user.findFirst({
    where: {
      number: to,
    },
  });

  if (String(toUser?.id) === String(from)) {
    return {
      success: false,
      message: "Cannot transfer to yourself",
    };
  }

  if (!toUser) {
    return {
      success: false,
      message: "User not found",
    };
  }
  try {
    await prisma.$transaction(async (tx) => {
      // TODO: Implement a lock mechanism to prevent multiple transfers from the same user simultaneously
      await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(from)} FOR UPDATE`;

      const fromBalance = await tx.balance.findUnique({
        where: { userId: Number(from) },
      });

      if (!fromBalance || fromBalance.amount < amount) {
        throw new Error("Insufficient funds");
      }

      await tx.balance.update({
        where: { userId: Number(from) },
        data: { amount: { decrement: amount } },
      });

      await tx.balance.update({
        where: { userId: toUser.id },
        data: { amount: { increment: amount } },
      });

      await tx.p2pTransfer.create({
        data: {
          fromUserId: Number(from),
          toUserId: toUser.id,
          amount,
          timestamp: new Date(),
        },
      });
    });
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Error while sending",
    };
  }

  return {
    success: true,
    message: "Transfer successful",
  };
}
