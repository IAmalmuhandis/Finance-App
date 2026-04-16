import { prisma, TxnType, AccountKind } from "../src/index.js";
import bcrypt from "bcryptjs";

function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function main() {
  const email = "demo@financeos.local";
  const password = "demo1234";

  const passwordHash = await bcrypt.hash(password, 10);

  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.create({
      data: { email, name: "Demo User", passwordHash },
    }));

  const account =
    (await prisma.account.findFirst({
      where: { userId: user.id, name: "Demo Checking" },
    })) ??
    (await prisma.account.create({
      data: {
        userId: user.id,
        name: "Demo Checking",
        kind: AccountKind.PERSONAL,
        currency: "USD",
      },
    }));

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), 1);

  const txns = [
    { day: 1, desc: "PAYROLL ACME CORP", amount: 4200, type: TxnType.CREDIT },
    { day: 2, desc: "RENT PAYMENT", amount: 1800, type: TxnType.DEBIT },
    { day: 3, desc: "STARBUCKS #1234", amount: 6.75, type: TxnType.DEBIT },
    { day: 4, desc: "WHOLE FOODS MARKET", amount: 92.18, type: TxnType.DEBIT },
    { day: 5, desc: "SHELL OIL", amount: 54.22, type: TxnType.DEBIT },
    { day: 8, desc: "NETFLIX.COM", amount: 15.99, type: TxnType.DEBIT },
    { day: 10, desc: "TRANSFER TO SAVINGS", amount: 500, type: TxnType.DEBIT },
    { day: 15, desc: "FREELANCE CLIENT INVOICE", amount: 650, type: TxnType.CREDIT },
    { day: 18, desc: "UBER TRIP", amount: 21.4, type: TxnType.DEBIT },
    { day: 22, desc: "AMAZON.COM", amount: 128.53, type: TxnType.DEBIT },
  ];

  const month = ym(base);

  const existing = await prisma.transaction.count({
    where: { userId: user.id, accountId: account.id, month },
  });

  if (existing === 0) {
    await prisma.transaction.createMany({
      data: txns.map((t) => {
        const postedAt = new Date(base.getFullYear(), base.getMonth(), t.day);
        return {
          userId: user.id,
          accountId: account.id,
          postedAt,
          description: t.desc,
          amount: t.amount as any,
          type: t.type,
          month,
        };
      }),
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete. Login: demo@financeos.local / demo1234");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

