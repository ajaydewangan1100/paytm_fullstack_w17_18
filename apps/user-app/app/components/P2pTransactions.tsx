"use client";
import { Card } from "@repo/ui/card";
import { useSession } from "next-auth/react";

export const P2pTransactions = ({
  transactions,
}: {
  transactions: {
    time: Date;
    amount: number;
    // TODO: Can the type of `status` be more specific?
    fromUserId: number;
    toUserId: number;
  }[];
}) => {
  if (!transactions.length) {
    return (
      <Card title="Recent Transactions">
        <div className="text-center pb-8 pt-8">No Recent transactions</div>
      </Card>
    );
  }

  const { data: session, status }: any = useSession();
  //   console.log(session?.user?.id);

  return (
    <Card title="Recent Transactions">
      <div className="pt-2 max-h-48 overflow-y-auto pr-2">
        {transactions.reverse().map((t) => (
          <div className="flex justify-between" key={t.time.toString()}>
            <div>
              <div className="text-sm">Received INR</div>
              <div className="text-slate-600 text-xs">
                {t.time.toDateString()}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              {Number(session && session?.user && session?.user?.id) ===
              Number(t.fromUserId)
                ? "-"
                : "+"}{" "}
              Rs {t.amount / 100}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
