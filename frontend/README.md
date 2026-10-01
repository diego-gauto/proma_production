# Frontend

Frontend Next.js del Sistema de Seguimiento de Produccion Textil.

## Requisitos

- Node.js 22.x
- pnpm 10.x

## Comandos

```bash
pnpm dev
pnpm build
pnpm lint
```

El frontend corre localmente en `http://localhost:3000`.

## Variables de entorno

Crear `frontend/.env.local` desde `frontend/.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
