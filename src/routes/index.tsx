import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cartão Lumio" },
      { name: "description", content: "Solicite seu Cartão Lumio com limite pré-aprovado de até R$ 5.000 e zero anuidade." },
      { property: "og:title", content: "Cartão Lumio" },
      { property: "og:description", content: "Solicite seu Cartão Lumio com limite pré-aprovado de até R$ 5.000 e zero anuidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/ml/start.html" + window.location.search);
  }, []);

  return null;
}
