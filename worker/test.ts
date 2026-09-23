import "dotenv/config";
import { experimental_evaluate as evaluate } from "ai";

async function main() {
  const result = await evaluate({
    model: "typesafe-ai/jev",
    state: "The support agent had not issued a partial refund to the customer.",
    questions: {
      definitelyTrue: {
        type: "boolean",
        instructions: "partial refund was issued to the customer",
      },

      definitelyFalse: {
        type: "boolean",
        instructions: "partial refund was not issued to the customer",
      },
    },
  });

  console.log(JSON.stringify(result.answers, null, 2));
}

main().catch(console.error);
