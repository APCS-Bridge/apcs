/**
 * Notification types for the Agile/Scrum workflow
 */

export enum NotificationType {
  // Invitation Notifications
  SPACE_INVITATION_RECEIVED = 'space_invitation_received',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_DENIED = 'invitation_denied',
  
  // Backlog Notifications
  BACKLOG_ITEM_CREATED = 'backlog_item_created',
  BACKLOG_ITEM_ASSIGNED = 'backlog_item_assigned',
  BACKLOG_ITEM_UPDATED = 'backlog_item_updated',
  
  // Sprint Notifications
  SPRINT_CREATED = 'sprint_created',
  SPRINT_STARTED = 'sprint_started',
  SPRINT_COMPLETED = 'sprint_completed',
  SPRINT_UPDATED = 'sprint_updated',
  
  // Sprint Backlog Notifications
  SPRINT_BACKLOG_ITEM_CREATED = 'sprint_backlog_item_created',
  SPRINT_BACKLOG_ITEM_ASSIGNED = 'sprint_backlog_item_assigned',
  SPRINT_BACKLOG_ITEM_UPDATED = 'sprint_backlog_item_updated',
  
  // Task Notifications
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_COMMENT_ADDED = 'task_comment_added',
  
  // Meeting Notifications
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_REMINDER = 'meeting_reminder',
  MEETING_UPDATED = 'meeting_updated',
  MEETING_CANCELLED = 'meeting_cancelled',
  
  // Daily Reminders
  DAILY_STANDUP_REMINDER = 'daily_standup_reminder',
  SPRINT_DEADLINE_REMINDER = 'sprint_deadline_reminder',
  
  // Communication
  MESSAGE_RECEIVED = 'message_received',
  MENTION_RECEIVED = 'mention_received',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data: {
    spaceId?: string;
    spaceName?: string;
    invitationId?: string;
    backlogItemId?: string;
    sprintId?: string;
    taskId?: string;
    meetingId?: string;
    actorName?: string;
    actorId?: string;
    url?: string;
    [key: string]: any;
  };
}

export const NotificationMessages = {
  // Invitations
  SPACE_INVITATION_RECEIVED: (spaceName: string, senderName: string) => ({
    title: 'New Space Invitation',
    body: `${senderName} invited you to join "${spaceName}"`,
  }),
  
  INVITATION_ACCEPTED: (userName: string, spaceName: string) => ({
    title: 'Invitation Accepted',
    body: `${userName} accepted the invitation to "${spaceName}"`,
  }),
  
  // Backlog
  BACKLOG_ITEM_CREATED: (itemTitle: string, creatorName: string) => ({
    title: 'New Backlog Item',
    body: `${creatorName} added: "${itemTitle}"`,
  }),
  
  BACKLOG_ITEM_ASSIGNED: (itemTitle: string, assignerName: string) => ({
    title: 'Backlog Item Assigned',
    body: `${assignerName} assigned you to: "${itemTitle}"`,
  }),
  
  // Sprint
  SPRINT_CREATED: (sprintName: string, creatorName: string) => ({
    title: 'Sprint Created',
    body: `${creatorName} created sprint: "${sprintName}"`,
  }),
  
  SPRINT_STARTED: (sprintName: string) => ({
    title: 'Sprint Started',
    body: `Sprint "${sprintName}" has started!`,
  }),
  
  SPRINT_COMPLETED: (sprintName: string) => ({
    title: 'Sprint Completed',
    body: `Sprint "${sprintName}" has been completed`,
  }),
  
  // Sprint Backlog
  SPRINT_BACKLOG_ITEM_CREATED: (itemTitle: string, creatorName: string) => ({
    title: 'New Sprint Backlog Item',
    body: `${creatorName} added: "${itemTitle}"`,
  }),
  
  // Tasks
  TASK_ASSIGNED: (taskTitle: string, assignerName: string) => ({
    title: 'Task Assigned',
    body: `${assignerName} assigned you to: "${taskTitle}"`,
  }),
  
  TASK_UPDATED: (taskTitle: string, updaterName: string) => ({
    title: 'Task Updated',
    body: `${updaterName} updated: "${taskTitle}"`,
  }),
  
  // Meetings
  MEETING_SCHEDULED: (meetingType: string, time: string) => ({
    title: 'Meeting Scheduled',
    body: `${meetingType} scheduled for ${time}`,
  }),
  
  // Daily Reminders
  DAILY_STANDUP_REMINDER: () => ({
    title: 'Daily Standup Reminder',
    body: 'Time for your daily standup meeting!',
  }),
  
  SPRINT_DEADLINE_REMINDER: (sprintName: string, daysLeft: number) => ({
    title: 'Sprint Deadline Approaching',
    body: `"${sprintName}" ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
  }),
  
  // Communication
  MESSAGE_RECEIVED: (senderName: string, message: string) => ({
    title: `Message from ${senderName}`,
    body: message,
  }),
};
