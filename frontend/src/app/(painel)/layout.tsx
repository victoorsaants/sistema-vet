import CabecalhoPainel from "@/components/cabecalho_painel";
import MenuLateral from "@/components/menu_lateral";
import { obter_usuario_logado } from "@/lib/dal";

export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const usuario = await obter_usuario_logado();

  return (
    <div className="flex min-h-screen">
      <MenuLateral usuario={usuario} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <CabecalhoPainel />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
