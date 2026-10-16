'use client';
import { useParams } from 'next/navigation';
import { SupplyWorkspace } from '@/components/ordenes/SupplyWorkspace/SupplyWorkspace';
export default function SupplyDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  return <SupplyWorkspace orderId={orderId} />;
}
