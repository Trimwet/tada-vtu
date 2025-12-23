import { NextRequest, NextResponse } from "next/server";
import {
  generateSpendingInsight,
  generateTransactionSummary,
  comparePrices,
  humanizeError,
  getBestDealsAllNetworks,
} from "@/lib/api/ai-insights";

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    switch (type) {
      case "spending-insight": {
        const result = await generateSpendingInsight(data);
        return NextResponse.json(result);
      }

      case "transaction-summary": {
        const period = data.period || "month";
        const spending = data.spending;
        
        // Use actual spending data if provided
        if (spending) {
          const result = await generateTransactionSummary([], period, spending);
          return NextResponse.json(result);
        }
        
        // Fallback for no data
        return NextResponse.json({
          summary: `Start making transactions to see your ${period}ly summary!`,
          highlights: ["No transactions yet"],
          recommendation: "Make your first purchase to get personalized insights!",
        });
      }

      case "price-comparison": {
        const result = await comparePrices(data.targetGB, data.currentNetwork);
        return NextResponse.json(result);
      }

      case "best-deals-all": {
        const result = getBestDealsAllNetworks();
        return NextResponse.json(result);
      }

      case "humanize-error": {
        const result = await humanizeError(
          data.errorCode,
          data.errorMessage,
          data.context
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
