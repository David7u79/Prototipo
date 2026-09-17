import { serverApi } from '@/lib/auth';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return Response.json([]);
  const result = await serverApi().movements.list({ search: query, limit: 10 });
  return Response.json(result.items);
}
