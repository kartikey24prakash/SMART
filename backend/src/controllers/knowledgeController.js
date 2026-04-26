import Event from "../model/Event.js";

const formatEventForPrompt = (event) => {
  return [
    `Event name: ${event.name}`,
    event.description ? `Description: ${event.description}` : "",
    event.eventType ? `Event type: ${event.eventType}` : "",
    event.participationType ? `Participation type: ${event.participationType}` : "",
    event.registrationStartDate
      ? `Registration starts: ${new Date(event.registrationStartDate).toISOString()}`
      : "",
    event.registrationEndDate
      ? `Registration ends: ${new Date(event.registrationEndDate).toISOString()}`
      : "",
    event.eventDate ? `Event date: ${new Date(event.eventDate).toISOString()}` : "",
    event.venue ? `Venue: ${event.venue}` : "",
    event.status ? `Status: ${event.status}` : "",
    event.maxParticipants ? `Maximum participants: ${event.maxParticipants}` : "",
    event.rules ? `Rules: ${event.rules}` : "",
    event.prizes?.length ? `Prizes: ${event.prizes.join(", ")}` : "",
    event.participationType === "team"
      ? `Team configuration: minimum team size ${event.teamConfig?.minTeamSize || 1}, maximum team size ${
          event.teamConfig?.maxTeamSize || 1
        }, gender requirement ${event.teamConfig?.genderRequirement || "none"}, cross institution allowed ${
          event.teamConfig?.allowCrossInstitution ? "yes" : "no"
        }`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const generateGroqAnswer = async ({ question, event }) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions only using the provided event data. If the event data does not contain the answer, say that clearly and briefly.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nEvent data:\n${formatEventForPrompt(event)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Generation request failed: ${response.status} ${errorBody}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() || null;
};

export const answerKnowledgeQuestion = async (req, res, next) => {
  try {
    const { question, eventId } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const answer =
      (await generateGroqAnswer({
        question,
        event,
      })) || "I could not generate an answer from the available event details.";

    res.json({
      answer,
      event: {
        _id: event._id,
        name: event.name,
      },
    });
  } catch (error) {
    next(error);
  }
};
