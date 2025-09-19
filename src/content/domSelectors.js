
export const steamSelectors = {
  chatRoot: ".chatHistoryAndMembers", // anchor on message blocks directly

  // Each chat block
  messageItem: ".ChatMessageBlock",

  // Speaker name inside a block
  speakerName: ".speakerName",

  // Message text inside a block
  messageText: ".msgText",

  selfBadge: "",

  // Input area (to send messages)
  inputEditable: ".chatentry_chatTextarea_113iu"
};
