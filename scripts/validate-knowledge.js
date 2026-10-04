import { assertKnowledgeBaseValid } from "../src/knowledge-validator.js";

const result = assertKnowledgeBaseValid();
console.log(JSON.stringify(result, null, 2));
