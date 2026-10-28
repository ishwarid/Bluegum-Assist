import { RETRIEVAL_CASES } from "./retrieval-cases";
import { evaluateRetrieval, formatRetrievalReport } from "./retrieval";

const report = evaluateRetrieval(RETRIEVAL_CASES);
console.log(formatRetrievalReport(report));
