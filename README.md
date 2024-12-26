# Turborepo starter

- Do Clone given repo (or below follow the steps if don't want to clone)

```jsx
git clone https://github.com/100xdevs-cohort-2/week-17-final-code
```

- npm install
- Run postgres either locally or on the cloud (neon.tech)

```jsx
docker run  -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```

- Copy over all .env.example files to .env
- Update .env files everywhere with the right db url
- Go to `packages/db`
  - npx prisma migrate dev
  - npx prisma db seed
- Go to `apps/user-app` , run `npm run dev`
- Try logging in using phone - 1111111111 , password - alice (See `seed.ts`)

---

### Steps to do without clone -

- On Ramping

  - Creating a dummy bank server -

    (Allows PayTM to generate a `token` for a payment for a user for some amount)

  ```
  POST /api/transaction
  {
      "user_identifier": "1",
      "amount": "59900", // Rs 599
      "webhookUrl": "http://localhost:3003/hdfcWebhook"
  }
  ```

  - PayTM should redirect the user to - `https://bank-api-frontend.com/pay?token={token_from_step_1}`

  - If user made a successful payment, Bank should hit the webhookUrl for the company

- Creating a bank_webhook_handler Node.js project

  - Init `node.js` project + `esbuild`

    ```
    cd apps
    mkdir bank_webhook_handler
    cd bank_webhook_handler
    npm init -y
    npx tsc --init
    npm i esbuild express @types/express
    ```

  - Update tsconfig

    ```
    {
        "extends": "@repo/typescript-config/base.json",
        "compilerOptions": {
        "outDir": "dist"
        },
        "include": ["src"],
        "exclude": ["node_modules", "dist"]
    }

    ```

  - Create `src/index.ts`

    ```
    import express from "express";

    const app = express();

    app.post("/hdfcWebhook", (req, res) => {
        //TODO: Add zod validation here?
        const paymentInformation = {
            token: req.body.token,
            userId: req.body.user_identifier,
            amount: req.body.amount
        };
        // Update balance in db, add txn
    })
    ```

- Update DB Schema

  ```
  generator client {
  provider = "prisma-client-js"
  }

  datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  }

  model User {
  id                Int                 @id @default(autoincrement())
  email             String?             @unique
  name              String?
  number            String              @unique
  password          String
  OnRampTransaction OnRampTransaction[]
  Balance           Balance[]
  }

  model Merchant {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  auth_type AuthType
  }

  model OnRampTransaction {
  id        Int          @id @default(autoincrement())
  status    OnRampStatus
  token     String       @unique
  provider  String
  amount    Int
  startTime DateTime
  userId    Int
  user      User         @relation(fields: [userId], references: [id])
  }

  model Balance {
  id     Int  @id @default(autoincrement())
  userId Int  @unique
  amount Int
  locked Int
  user   User @relation(fields: [userId], references: [id])
  }

  enum AuthType {
  Google
  Github
  }

  enum OnRampStatus {
  Success
  Failure
  Processing
  }

  ```

- Migrate the DB - Go to the right folder `packages/db`

  - `npx prisma migrate dev --name add_balance`

- Add `repo/db` as a dependency to `packate.json` - `"@repo/db": "*"`

- Add transaction to update the balance and transactions DB Ref - `https://www.prisma.io/docs/orm/prisma-client/queries/transactions`

  ```
  import express from "express";
  import db from "@repo/db/client";

  const app = express();
  app.use(express.json());

  app.post("/hdfcWebhook", async (req, res) => {
  //TODO: Add zod validation here?
  //   Check if this request actually came from hdfc bank, use a webhook secret here
    const paymentInformation: {
        token: string;
        userId: string;
        amount: string;
    } = {
        token: req.body.token,
        userId: req.body.user_identifier,
        amount: req.body.amount,
    };

    try {
        //   transaction
        await db.balance.update({
        where: {
            userId: Number(paymentInformation.userId),
        },
        data: {
            amount: { increment: Number(paymentInformation.amount) },
        },
        });

        await db.onRampTransaction.update({
            where: { token: paymentInformation.token },
            data: {
                status: "Success",
            },
        });

        res.json({
            success: true,
            message: "Captured",
        });
    } catch (error) {
        return res.status(411).json({
            success: false,
            message: "Something didn't works",
        });
    }
  });

  const PORT = 3003;
  app.listen(PORT, () => console.log("Running on port " + PORT));

  ```

- Create generic appbar

  Create a new `AppbarClient` component in `apps/user-app/component/AppbarClient.tsx`

  ```
    "use client"
    import { signIn, signOut, useSession } from "next-auth/react";
    import { Appbar } from "@repo/ui/appbar";
    import { useRouter } from "next/navigation";

    export function AppbarClient() {
        const session = useSession();
        const router = useRouter();

        return (
            <div>
                <Appbar onSignin={signIn} onSignout={async () => {
                    await signOut()
                    router.push("/api/auth/signin")
                }} user={session.data?.user} />
            </div>
        );
    }
  ```

- Add `AppbarClient` to `layout.tsx`

  ```
  .
  .
  import { AppbarClient } from "../components/AppbarClient";
  .
  .
  <Providers>
      <AppbarClient />
      <body className={inter.className}>{children}</body>
    </Providers>
  ```

- Create sidebar -

  - Create `user-app/(dashboard)` folder and add 3 pages inside it -

    - `dashboard/page.tsx`
    - `transactions/page.tsx`
    - `transfer/page.tsx`

  ```
    export default function() {
        return <div>
            Dashboard Page (or transfer/txn page)
        </div>
    }
  ```

- Create `user-app/(dashboard)/layout.tsx`

  - Library for icons - `https://heroicons.com/`

    ```
    import { SidebarItem } from "../../components/SidebarItem";

    export default function Layout({
    children,
    }: {
    children: React.ReactNode;
    }): JSX.Element {
    return (
        <div className="flex">
            <div className="w-72 border-r border-slate-300 min-h-screen mr-4 pt-28">
                <div>
                    <SidebarItem href={"/dashboard"} icon={<HomeIcon />} title="Home" />
                    <SidebarItem href={"/transfer"} icon={<TransferIcon />} title="Transfer" />
                    <SidebarItem href={"/transactions"} icon={<TransactionsIcon />} title="Transactions" />
                </div>
            </div>
                {children}
        </div>
    );
    }

    // Icons Fetched from https://heroicons.com/
    function HomeIcon() {
        return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
    }
    function TransferIcon() {
        return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
    }

    function TransactionsIcon() {
        return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>

    }
    ```

- Create SidebarItem component -

  ```
  "use client"
  import { usePathname, useRouter } from "next/navigation";
  import React from "react";

  export const SidebarItem = ({ href, title, icon }: { href: string; title: string; icon: React.ReactNode }) => {
      const router = useRouter();
      const pathname = usePathname()
      const selected = pathname === href

      return <div className={`flex ${selected ? "text-[#6a51a6]" : "text-slate-500"} cursor-pointer  p-2 pl-8`} onClick={() => {
          router.push(href);
      }}>
          <div className="pr-2">
              {icon}
          </div>
          <div className={`font-bold ${selected ? "text-[#6a51a6]" : "text-slate-500"}`}>
              {title}
          </div>
      </div>
  }
  ```

- create `app/layout.tsx`

  ```
    import "./globals.css";
    import type { Metadata } from "next";
    import { Inter } from "next/font/google";
    import { Providers } from "../provider";
    import { AppbarClient } from "./components/AppbarClient";

    const inter = Inter({ subsets: ["latin"] });

    export const metadata: Metadata = {
    title: "Wallet",
    description: "Simple wallet app",
    };

    export default function RootLayout({
    children,
    }: {
    children: React.ReactNode;
    }): JSX.Element {
    return (
        <html lang="en">
        <Providers>
            <body className={inter.className}>
            <div className="min-w-screen min-h-screen bg-[#ebe6e6]">
                <AppbarClient />
                {children}
            </div>
            </body>
        </Providers>
        </html>
    );
    }

  ```

- create - `app/page.tsx`

  ```
    import { getServerSession } from "next-auth";
    import { redirect } from "next/navigation";
    import { authOptions } from "./lib/auth";

    export default async function Page() {
    const session = await getServerSession(authOptions);
    if (session?.user) {
        redirect("/dashboard");
    } else {
        redirect("/api/auth/signin");
    }
    }

  ```

- Run `user-app` and check routes -

  - `http://localhost:3001/dashboard`
  - `http://localhost:3001/transfer`
  - `http://localhost:3001/transactions`

- Create transfer page

  Add a better `card.tsx` component to `packages/ui/src` -

  ```
    import React from "react";

    export function Card({
    title,
    children,
    }: {
    title: string;
    children?: React.ReactNode;
    }): JSX.Element {
    return (
        <div
        className="border p-4"
        >
        <h1 className="text-xl border-b pb-2">
            {title}
        </h1>
        <p>{children}</p>
        </div>
    );
    }
  ```

- Add a `Center.tsx` component that centralizes (both verticaly and horizontally) the children given to it (in `packages/ui/src` ) -

  (NOTE - Make sure to export it in `package.json`)

  ```
    import React from "react"

    export const Center = ({ children }: { children: React.ReactNode }) => {
        return <div className="flex justify-center flex-col h-full">
            <div className="flex justify-center">
                {children}
            </div>
        </div>
    }
  ```

- Add a `Select.tsx` component to `packages/ui/src` (Make sure to export it) -

  ```
    "use client"
    export const Select = ({ options, onSelect }: {
        onSelect: (value: string) => void;
        options: {
            key: string;
            value: string;
        }[];
    }) => {
        return <select onChange={(e) => {
            onSelect(e.target.value)
        }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
            {options.map(option => <option value={option.key}>{option.value}</option>)}
    </select>
    }
  ```

- Add `TextInput.tsx` component to `packages/ui/src` -

  ```
    "use client"

    export const TextInput = ({
        placeholder,
        onChange,
        label
    }: {
        placeholder: string;
        onChange: (value: string) => void;
        label: string;
    }) => {
        return <div className="pt-2">
            <label className="block mb-2 text-sm font-medium text-gray-900">{label}</label>
            <input onChange={(e) => onChange(e.target.value)} type="text" id="first_name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder={placeholder} />
        </div>
    }
  ```

- Update - `packages/ui/package.json` - add exports

  ```
    "./center": "./src/Center.tsx",
    "./select": "./src/Select.tsx",
    "./textinput": "./src/TextInput.tsx"
  ```

- Create `user-app/components/AddMoneyCard.tsx` -

  ```
    "use client";
    import { Button } from "@repo/ui/button";
    import { Card } from "@repo/ui/card";
    import { Center } from "@repo/ui/center";
    import { Select } from "@repo/ui/select";
    import { useState } from "react";
    import { TextInput } from "@repo/ui/textinput";

    const SUPPORTED_BANKS = [
    {
        name: "HDFC Bank",
        redirectUrl: "https://netbanking.hdfcbank.com",
    },
    {
        name: "Axis Bank",
        redirectUrl: "https://www.axisbank.com/",
    },
    ];

    export const AddMoney = () => {
    const [redirectUrl, setRedirectUrl] = useState(
        SUPPORTED_BANKS[0]?.redirectUrl
    );
    return (
        <Card title="Add Money">
        <div className="w-full">
            <TextInput
            label={"Amount"}
            placeholder={"Amount"}
            onChange={() => {}}
            />
            <div className="py-4 text-left">Bank</div>
            <Select
            onSelect={(value) => {
                setRedirectUrl(
                SUPPORTED_BANKS.find((x) => x.name === value)?.redirectUrl || ""
                );
            }}
            options={SUPPORTED_BANKS.map((x) => ({
                key: x.name,
                value: x.name,
            }))}
            />
            <div className="flex justify-center pt-4">
            <Button
                onClick={() => {
                window.location.href = redirectUrl || "";
                }}>
                Add Money
            </Button>
            </div>
        </div>
        </Card>
    );
    };

  ```

- Create `user-app/components/BalanceCard.tsx`

  ```
  import { Card } from "@repo/ui/card";

  export const BalanceCard = ({amount, locked}: {
      amount: number;
      locked: number;
  }) => {
      return <Card title={"Balance"}>
          <div className="flex justify-between border-b border-slate-300 pb-2">
              <div>
                  Unlocked balance
              </div>
              <div>
                  {amount / 100} INR
              </div>
          </div>
          <div className="flex justify-between border-b border-slate-300 py-2">
              <div>
                  Total Locked Balance
              </div>
              <div>
                  {locked / 100} INR
              </div>
          </div>
          <div className="flex justify-between border-b border-slate-300 py-2">
              <div>
                  Total Balance
              </div>
              <div>
                  {(locked + amount) / 100} INR
              </div>
          </div>
      </Card>
  }
  ```

- Create `user-app/components/OnRampTransaction.tsx` -

  ```
  import { Card } from "@repo/ui/card"

  export const OnRampTransactions = ({
      transactions
  }: {
      transactions: {
          time: Date,
          amount: number,
          // TODO: Can the type of `status` be more specific?
          status: string,
          provider: string
      }[]
  }) => {
      if (!transactions.length) {
          return <Card title="Recent Transactions">
              <div className="text-center pb-8 pt-8">
                  No Recent transactions
              </div>
          </Card>
      }
      return <Card title="Recent Transactions">
          <div className="pt-2">
              {transactions.map(t => <div className="flex justify-between">
                  <div>
                      <div className="text-sm">
                          Received INR
                      </div>
                      <div className="text-slate-600 text-xs">
                          {t.time.toDateString()}
                      </div>
                  </div>
                  <div className="flex flex-col justify-center">
                      + Rs {t.amount / 100}
                  </div>

              </div>)}
          </div>
      </Card>
  }
  ```

- Create `user-app/app/(dashboard)/transfer/page.tsx` -

  ```
    import prisma from "@repo/db/client";
    import { AddMoney } from "../../../components/AddMoneyCard";
    import { BalanceCard } from "../../../components/BalanceCard";
    import { OnRampTransactions } from "../../../components/OnRampTransactions";
    import { getServerSession } from "next-auth";
    import { authOptions } from "../../lib/auth";

    async function getBalance() {
        const session = await getServerSession(authOptions);
        const balance = await prisma.balance.findFirst({
            where: {
                userId: Number(session?.user?.id)
            }
        });
        return {
            amount: balance?.amount || 0,
            locked: balance?.locked || 0
        }
    }

    async function getOnRampTransactions() {
        const session = await getServerSession(authOptions);
        const txns = await prisma.onRampTransaction.findMany({
            where: {
                userId: Number(session?.user?.id)
            }
        });
        return txns.map(t => ({
            time: t.startTime,
            amount: t.amount,
            status: t.status,
            provider: t.provider
        }))
    }

    export default async function() {
        const balance = await getBalance();
        const transactions = await getOnRampTransactions();

        return <div className="w-screen">
            <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
                Transfer
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
                <div>
                    <AddMoney />
                </div>
                <div>
                    <BalanceCard amount={balance.amount} locked={balance.locked} />
                    <div className="pt-4">
                        <OnRampTransactions transactions={transactions} />
                    </div>
                </div>
            </div>
        </div>
    }
  ```

- Add some seed data -

  - Go to `packages/db`, add `prisma/seed.ts`

  ```
    import { PrismaClient } from '@prisma/client'
    const prisma = new PrismaClient()

    async function main() {
    const alice = await prisma.user.upsert({
        where: { number: '9999999999' },
        update: {},
        create: {
        number: '9999999999',
        password: 'alice',
        name: 'alice',
        OnRampTransaction: {
            create: {
            startTime: new Date(),
            status: "Success",
            amount: 20000,
            token: "122",
            provider: "HDFC Bank",
            },
        },
        },
    })
    const bob = await prisma.user.upsert({
        where: { number: '9999999998' },
        update: {},
        create: {
        number: '9999999998',
        password: 'bob',
        name: 'bob',
        OnRampTransaction: {
            create: {
            startTime: new Date(),
            status: "Failure",
            amount: 2000,
            token: "123",
            provider: "HDFC Bank",
            },
        },
        },
    })
    console.log({ alice, bob })
    }
    main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
  ```

  - Update `db/package.json` -

    ```
    "prisma": {
            "seed": "ts-node prisma/seed.ts"
        }
    ```

    - Run command to seed db - `npx prisma db seed`

    - Explore db - `npx prisma studio`

- Make landing page redirect -

  - The user should go to either the signin page or the dashboard page based on if they are logged in

  - Update root `page.tsx`

  ```
    import { getServerSession } from "next-auth";
    import { redirect } from 'next/navigation'
    import { authOptions } from "./lib/auth";

    export default async function Page() {
    const session = await getServerSession(authOptions);
    if (session?.user) {
        redirect('/dashboard')
    } else {
        redirect('/api/auth/signin')
    }

    }
  ```

### Clone or go ahead

- We can go ahead with our project if everything working fine

- OR From link we can clone repo (If our created project have any issues)

- `https://github.com/100xdevs-cohort-2/week-17-final-code`

- If cloned - follow steps to setup -

```
git clone https://github.com/100xdevs-cohort-2/week-17-final-code
```

- npm install
- Run postgres either locally or on the cloud (neon.tech)

```jsx
docker run  -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```

- Copy over all .env.example files to .env
- Update .env files everywhere with the right db url
- Go to `packages/db`
  - npx prisma migrate dev
  - npx prisma db seed
- Go to `apps/user-app` , run `npm run dev`
- Try to login using phone - 1111111111 , password - alice (See `seed.ts`)

### Next steps

mulitple issues are there with app, we need to solve then

can check `https://github.com/100xdevs-cohort-2/week-17-final-code/issues`

1. Finish onramps - Right now, we’re able to see the onramp transactions that have been seeded

   - Clicking on the `Add Money` button should initiate a new entry in the `onRampTransactions` table, that is eventually fulfilled by the bank-webhook module

   - implement this feature via a `server action` -

   - Create a new action in `user-app/app/lib/actions/createOnrampTransaction.ts`

     ```
     "use server";

      import prisma from "@repo/db/client";
      import { getServerSession } from "next-auth";
      import { authOptions } from "../auth";

      export async function createOnRampTransaction(provider: string, amount: number) {
          // Ideally the token should come from the banking provider (hdfc/axis)
          const session = await getServerSession(authOptions);
          if (!session?.user || !session.user?.id) {
              return {
                  message: "Unauthenticated request"
              }
          }
          const token = (Math.random() * 1000).toString();
          await prisma.onRampTransaction.create({
              data: {
                  provider,
                  status: "Processing",
                  startTime: new Date(),
                  token: token,
                  userId: Number(session?.user?.id),
                  amount: amount * 100
              }
          });

          return {
              message: "Done"
          }
      }

     ```

   - Call the action when the button is pressed (update `AddMoneyCard`)

   ```
   "use client"
   import { Button } from "@repo/ui/button";
   import { Card } from "@repo/ui/card";
   import { Select } from "@repo/ui/select";
   import { useState } from "react";
   import { TextInput } from "@repo/ui/textinput";
   import { createOnRampTransaction } from "../app/lib/actions/createOnrampTransaction";

   const SUPPORTED_BANKS = [{
       name: "HDFC Bank",
       redirectUrl: "https://netbanking.hdfcbank.com"
   }, {
       name: "Axis Bank",
       redirectUrl: "https://www.axisbank.com/"
   }];

   export const AddMoney = () => {
       const [redirectUrl, setRedirectUrl] = useState(SUPPORTED_BANKS[0]?.redirectUrl);
       const [provider, setProvider] = useState(SUPPORTED_BANKS[0]?.name || "");
       const [value, setValue] = useState(0)
       return <Card title="Add Money">
       <div className="w-full">
           <TextInput label={"Amount"} placeholder={"Amount"} onChange={(val) => {
               setValue(Number(val))
           }} />
           <div className="py-4 text-left">
               Bank
           </div>
           <Select onSelect={(value) => {
               setRedirectUrl(SUPPORTED_BANKS.find(x => x.name === value)?.redirectUrl || "");
               setProvider(SUPPORTED_BANKS.find(x => x.name === value)?.name || "");
           }} options={SUPPORTED_BANKS.map(x => ({
               key: x.name,
               value: x.name
           }))} />
           <div className="flex justify-center pt-4">
               <Button onClick={async () => {
                   await createOnRampTransaction(provider, Number(value) * 100)
                   window.location.href = redirectUrl || "";
               }}>
               Add Money
               </Button>
           </div>
       </div>
   </Card>
   }
   ```

- Simulating the bank webhook

  - cd `apps/bank-webhook`

  - `npm run dev` (If fails, install `esbuild`)

  - In another terminal, get the token for one of the onRamp transactions by running `npx prisma studio` in packages/db

  - Simulate a hdfcBank transaction - `POST http://localhost:PORT/hdfcWebhook`

    ```
    {
        "token": <Same_token>,
        "user_identifier": 1,
        "amount": "210"
    }
    ```

2. Add transfers

   Once money has been onramped, users should be allowed to transfer money to various wallets

   - create a `P2P transfer` page - go to `user-app/app/(dashboard)/layout.tsx` update -

   ```
       <SidebarItem href={"/p2p"} icon={<P2PTransferIcon />} title="P2P Transfer" />

       function P2PTransferIcon() {
           return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
               <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
           </svg>
       }
   ```

   - Create a handler for `/p2p` page by creating `user-app/app/(dashboarD)/p2p/page.tsx`

   ```
   export default function() {
       return <div>
           Dashboard
       </div>
   }
   ```

   - Add a SendCard component that let’s us put the number of a user and amount to send - `user-app/components/SendCard.tsx`

   ```
   "use client"
   import { Button } from "@repo/ui/button";
   import { Card } from "@repo/ui/card";
   import { Center } from "@repo/ui/center";
   import { TextInput } from "@repo/ui/textinput";
   import { useState } from "react";

   export function SendCard() {
       const [number, setNumber] = useState("");
       const [amount, setAmount] = useState("");

       return <div className="h-[90vh]">
           <Center>
               <Card title="Send">
                   <div className="min-w-72 pt-2">
                       <TextInput placeholder={"Number"} label="Number" onChange={(value) => {
                           setNumber(value)
                       }} />
                       <TextInput placeholder={"Amount"} label="Amount" onChange={(value) => {
                           setAmount(value)
                       }} />
                       <div className="pt-4 flex justify-center">
                           <Button onClick={() => {

                           }}>Send</Button>
                       </div>
                   </div>
               </Card>
           </Center>
       </div>
   }
   ```

   -update - `user-app/app/(dashboard)/p2p/page.tsx`

   ```
   import { SendCard } from "../../../components/SendCard";

   export default function() {
       return <div className="w-full">
           <SendCard />
       </div>
   }
   ```

   - Create a new action in `user-app/app/lib/actions/p2pTransfer.tsx`

   ```
   "use server"
   import { getServerSession } from "next-auth";
   import { authOptions } from "../auth";
   import prisma from "@repo/db/client";

   export async function p2pTransfer(to: string, amount: number) {
       const session = await getServerSession(authOptions);
       const from = session?.user?.id;
       if (!from) {
           return {
               message: "Error while sending"
           }
       }
       const toUser = await prisma.user.findFirst({
           where: {
               number: to
           }
       });

       if (!toUser) {
           return {
               message: "User not found"
           }
       }
       await prisma.$transaction(async (tx) => {
           const fromBalance = await tx.balance.findUnique({
               where: { userId: Number(from) },
           });
           if (!fromBalance || fromBalance.amount < amount) {
               throw new Error('Insufficient funds');
           }

           await tx.balance.update({
               where: { userId: Number(from) },
               data: { amount: { decrement: amount } },
           });

           await tx.balance.update({
               where: { userId: toUser.id },
               data: { amount: { increment: amount } },
           });
       });
   }
   ```

   - Update `SendCard` to call this action

     ```
        "use client"
        import { Button } from "@repo/ui/button";
        import { Card } from "@repo/ui/card";
        import { Center } from "@repo/ui/center";
        import { TextInput } from "@repo/ui/textinput";
        import { useState } from "react";
        import { p2pTransfer } from "../app/lib/actions/p2pTransfer";

        export function SendCard() {
            const [number, setNumber] = useState("");
            const [amount, setAmount] = useState("");

            return <div className="h-[90vh]">
                <Center>
                    <Card title="Send">
                        <div className="min-w-72 pt-2">
                            <TextInput placeholder={"Number"} label="Number" onChange={(value) => {
                                setNumber(value)
                            }} />
                            <TextInput placeholder={"Amount"} label="Amount" onChange={(value) => {
                                setAmount(value)
                            }} />
                            <div className="pt-4 flex justify-center">
                                <Button onClick={async () => {
                                    await p2pTransfer(number, Number(amount) * 100)
                                }}>Send</Button>
                            </div>
                        </div>
                    </Card>
                </Center>
            </div>
        }
     ```

   - Trying by sending money a few times and see if it works.

     - We can inspect DB balance will decrease - `npx prisma studio` in `packages/db`

   - Problem with this approach -

     - multiple transaction can update same user balance if first takes time and it can cause falsy values under DB

   - Locking of rows -

     - In postgres, a transaction ensure that either all the statements happen or none. It does not lock rows/ revert a transaction if something from this transaction got updated before the transaction committed (unlike MongoDB)
     - So we need to explicitly lock the balance row for the sending user so that only one transaction can access it at at time, and the other one waits until the first transaction has committed

     - References
       - Hint 1 - https://www.cockroachlabs.com/blog/select-for-update/
       - Hint 2 - https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries

     ```

     ```

   - Add `P2P transactions` table - Update `schema.prisma`

     ```
        model User {
        id                Int                 @id @default(autoincrement())
        email             String?             @unique
        name              String?
        number            String              @unique
        password          String
        OnRampTransaction OnRampTransaction[]
        Balance           Balance[]
        sentTransfers     p2pTransfer[]       @relation(name: "FromUserRelation")
        receivedTransfers p2pTransfer[]       @relation(name: "ToUserRelation")
        }

        model Merchant {
        id        Int      @id @default(autoincrement())
        email     String   @unique
        name      String?
        auth_type AuthType
        }

        model p2pTransfer {
        id         Int      @id @default(autoincrement())
        amount     Int
        timestamp  DateTime
        fromUserId Int
        fromUser   User     @relation(name: "FromUserRelation", fields: [fromUserId], references: [id])
        toUserId   Int
        toUser     User     @relation(name: "ToUserRelation", fields: [toUserId], references: [id])
        }

     ```

     - Run `npx prisma migrate dev --name added_p2p_txn`

     - Regenerate client `npx prisma generate` - (on Error - Close all apps if using the DB)

     - Do a global build (`npm run build`) (it’s fine if it fails)

     - Add entries to `p2pTransfer` whenever a transfer happens

   - Update `p2pTransfer.ts` to store P2P transaction information - (add this lines under transaction )

     ```
       await tx.p2pTransfer.create({
           data: {
           fromUserId: Number(from),
           toUserId: toUser.id,
           amount,
           timestamp: new Date(),
           },
       });
     ```

   - Update `apps/user-app/app/(dashboard)/p2p/page.tsx` so we will be able to see all transactions on same page and balance also

     ```
       import prisma from "@repo/db/client";
       import { SendCard } from "../../components/SendCard";
       import { getServerSession } from "next-auth";
       import { authOptions } from "../../lib/auth";
       import { BalanceCard } from "../../components/BalanceCard";
       import { P2pTransactions } from "../../components/P2pTransactions";

       async function getBalance() {
       const session = await getServerSession(authOptions);
       const balance = await prisma.balance.findFirst({
           where: {
           userId: Number(session?.user?.id),
           },
       });
       return {
           amount: balance?.amount || 0,
           locked: balance?.locked || 0,
       };
       }

       async function getP2pTransactions() {
       const session = await getServerSession(authOptions);
       const txns = await prisma.p2pTransfer.findMany({
           where: {
           OR: [
               { fromUserId: Number(session?.user?.id) },
               { toUserId: Number(session?.user?.id) },
           ],
           },
           include: {
           toUser: true,
           fromUser: true,
           },
       });

       return txns.map((t) => ({
           time: t.timestamp,
           amount: t.amount,
           fromUserId: t.fromUserId,
           toUserId: t.toUserId,
       }));
       }

       export default async function () {
       const balance = await getBalance();
       const transactions = await getP2pTransactions();

       return (
           <div className="w-screen">
           <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
               Transfer
           </div>
           <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
               <div>
               <SendCard />
               </div>
               <div>
               <BalanceCard amount={balance.amount} locked={balance.locked} />
               <div className="pt-4">
                   <P2pTransactions transactions={transactions} />
               </div>
               </div>
           </div>
           </div>
       );
       }

     ```
