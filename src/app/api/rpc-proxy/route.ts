import { getNetworkConfig } from "@/hooks/contract/useNetworkConfig";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const environment = process.env.ENVIRONMENT || "production";
    const { http } = getNetworkConfig(environment);

    const rpcUrl = http;
    const body = await req.json();

    const rpcResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await rpcResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RPC proxy error:", error);
    return NextResponse.json({ error: "RPC proxy error" }, { status: 500 });
  }
}
