import { config } from "./config";

export async function listGraphs() {
  const res = await fetch(`${config.graphApi}`);
  return res.json();
}

export async function createGraph(title: string) {
  const res = await fetch(`${config.graphApi}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

export async function getGraph(id: string) {
  const res = await fetch(`${config.graphApi}/${id}`);
  return res.json();
}

export async function getNodes(graphId: string) {
  const res = await fetch(`${config.graphApi}/${graphId}/nodes`);
  return res.json();
}

export async function getNode(nodeId: string) {
  const res = await fetch(`${config.nodeApi}/${nodeId}`);
  return res.json();
}
