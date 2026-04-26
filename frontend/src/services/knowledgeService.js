import api from "./api";

export const askKnowledgeQuestion = async ({ question, eventId }) => {
  const { data } = await api.post("/knowledge/answer", {
    question,
    eventId,
  });

  return data;
};
