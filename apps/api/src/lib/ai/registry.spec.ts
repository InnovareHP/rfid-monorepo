import { z } from "zod";
import {
  registerTools,
  resetRegistry,
  resolveTools,
  runTool,
} from "./registry";
import { AgentDefinition, AgentToolContext, defineTool } from "./types";

const CTX: AgentToolContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "user",
};

const agent = (tools: string[]): AgentDefinition => ({
  name: "test-agent",
  system: "",
  tools,
  maxHops: 2,
  maxActions: 1,
  maxTokens: 128,
  temperature: 0,
});

const echoTool = defineTool({
  name: "echo",
  description: "Call this to echo a value.",
  kind: "read",
  schema: z.object({ value: z.string() }),
  jsonSchema: { type: "object", properties: {}, required: [] },
  handler: (input) => Promise.resolve({ result: `echo:${input.value}` }),
});

const explodingTool = defineTool({
  name: "explode",
  description: "Call this to fail.",
  kind: "read",
  schema: z.object({}),
  jsonSchema: { type: "object", properties: {}, required: [] },
  handler: () => Promise.reject(new Error("boom")),
});

describe("agent registry", () => {
  beforeEach(() => {
    resetRegistry();
    registerTools([echoTool, explodingTool]);
  });

  it("rejects duplicate tool names", () => {
    expect(() => registerTools([echoTool])).toThrow("Duplicate agent tool");
  });

  it("resolves only the tools an agent was granted", () => {
    expect(resolveTools(["echo", "missing"])).toHaveLength(1);
  });

  it("refuses a tool the agent was not granted, even when registered", async () => {
    const outcome = await runTool(agent(["echo"]), "explode", {}, CTX);

    expect(outcome.result).toContain("not available");
  });

  it("returns a readable message instead of throwing on invalid arguments", async () => {
    const outcome = await runTool(agent(["echo"]), "echo", { value: 42 }, CTX);

    expect(outcome.result).toContain("not valid");
  });

  it("contains a throwing handler", async () => {
    const outcome = await runTool(agent(["explode"]), "explode", {}, CTX);

    expect(outcome.result).toContain("Do not retry");
  });

  it("runs a granted tool with validated input", async () => {
    const outcome = await runTool(
      agent(["echo"]),
      "echo",
      { value: "hi" },
      CTX
    );

    expect(outcome.result).toBe("echo:hi");
  });
});
