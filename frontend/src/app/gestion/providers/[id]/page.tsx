"use client";
import { useParams } from "next/navigation";
import { AppTopBar } from "../../../../components/layout/AppTopBar/AppTopBar";
import { PartnerDetail } from "../../../../components/gestion/PartnerDetail/PartnerDetail";
export default function ProviderDetailPage() { const params = useParams<{ id: string }>(); const id = Array.isArray(params.id) ? params.id[0] : params.id; return <><AppTopBar activeSection="masters" /><PartnerDetail resource="providers" id={id} /></>; }
