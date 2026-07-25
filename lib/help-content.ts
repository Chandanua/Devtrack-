export type HelpSection = {
  heading: string;
  items: { label: string; detail: string }[];
};

export type HelpContent = {
  title: string;
  description: string;
  sections: HelpSection[];
  tips?: string[];
  rules?: { label: string; detail: string }[];
};

export type HelpPageKey =
  | 'dashboard'
  | 'board'
  | 'tasks'
  | 'task-detail'
  | 'projects'
  | 'reports'
  | 'calendar'
  | 'team'
  | 'timesheet'
  | 'settings'
  | 'notifications';

export const HELP_CONTENT: Record<HelpPageKey, HelpContent> = {
  dashboard: {
    title: 'Dashboard Help',
    description: 'Your command centre — see everything at a glance.',
    sections: [
      {
        heading: 'Stat Cards',
        items: [
          { label: 'Total Tasks', detail: 'All tasks in your org, excluding subtasks.' },
          { label: 'Completed', detail: 'Tasks with status "Completed" across all projects.' },
          { label: 'In Progress', detail: 'Tasks currently being actively worked on.' },
          { label: 'Overdue', detail: 'Tasks past their due date that are not yet completed.' },
        ],
      },
      {
        heading: 'Recent Tasks',
        items: [
          { label: 'Sorting', detail: 'Sorted by last updated time — most recently changed first.' },
          { label: 'Click', detail: 'Click any task to open its full detail view.' },
          { label: 'View Board', detail: 'Use the "View board" button to jump to the Kanban board.' },
        ],
      },
      {
        heading: 'Projects Panel',
        items: [
          { label: 'Progress Bar', detail: 'Progress is auto-calculated based on completed tasks vs total tasks in that project.' },
          { label: 'Click', detail: 'Click any project to open its detail page.' },
        ],
      },
    ],
    tips: [
      'Bookmark the Dashboard as your daily starting point.',
      'Overdue tasks are the most urgent — tackle those first.',
      'Use the board link to drag tasks through statuses quickly.',
    ],
  },

  board: {
    title: 'Kanban Board Help',
    description: 'Visualise and move work through your workflow stages.',
    sections: [
      {
        heading: 'Columns & Statuses',
        items: [
          { label: 'Backlog', detail: 'Tasks that are captured but not yet scheduled. Ideas and future work live here.' },
          { label: 'To Do', detail: 'Work that is scheduled and ready to be picked up in the current cycle.' },
          { label: 'In Progress', detail: 'Actively being worked on right now. Keep this column small.' },
          { label: 'Code Review', detail: 'Dev work done, waiting for peer review or approval.' },
          { label: 'Testing', detail: 'Under QA validation. No new dev should be done here.' },
          { label: 'Blocked', detail: 'Work is stuck — needs dependency resolution or decision.' },
          { label: 'Completed', detail: 'Done and verified. Closed out.' },
        ],
      },
      {
        heading: 'Drag & Drop',
        items: [
          { label: 'Move Tasks', detail: 'Drag any card and drop it onto another column to change its status.' },
          { label: 'Real-time', detail: 'Status changes broadcast live to all team members via WebSocket.' },
          { label: 'Optimistic UI', detail: 'Cards move instantly; the server update happens in the background. If it fails, the card reverts.' },
        ],
      },
      {
        heading: 'WIP Limits',
        items: [
          { label: 'What is WIP?', detail: 'Work In Progress limits cap how many tasks can be in a column simultaneously. Exceeding it turns the column red.' },
          { label: 'Setting Limits', detail: 'Click "WIP Limits" in the top bar to configure per-column limits.' },
          { label: 'Best practice', detail: 'Keep "In Progress" limit to 1–3 per person. More than that causes context switching.' },
        ],
      },
      {
        heading: 'Swimlanes',
        items: [
          { label: 'None', detail: 'Default view — all tasks in all columns.' },
          { label: 'By Assignee', detail: 'Groups the board horizontally by team member. Great for standups.' },
          { label: 'By Priority', detail: 'Groups by Critical, High, Medium, Low. Helps identify what to pull next.' },
        ],
      },
    ],
    tips: [
      'Keep "In Progress" below your WIP limit at all times.',
      'If something is Blocked, add a comment explaining why before moving it.',
      'Use swimlanes by Assignee during daily standups.',
      'Right-click a card for quick actions (edit, delete, move).',
    ],
  },

  tasks: {
    title: 'My Tasks Help',
    description: 'All tasks assigned to you across every project.',
    sections: [
      {
        heading: 'Filters',
        items: [
          { label: 'Search', detail: 'Filters by task title in real-time as you type.' },
          { label: 'Status Filter', detail: 'Narrow to a specific workflow stage.' },
          { label: 'Priority Filter', detail: 'Show only tasks of a specific urgency.' },
        ],
      },
      {
        heading: 'Task List',
        items: [
          { label: 'Red Due Date', detail: 'A red date means the task is overdue. Act on these first.' },
          { label: 'Tags', detail: 'Coloured chips show the tags attached to a task.' },
          { label: 'Click', detail: 'Click any row to open the full task detail page.' },
        ],
      },
    ],
    tips: [
      'Sort your day by tackling overdue tasks first, then Critical priority.',
      'Use the status filter to find tasks you need to move forward.',
    ],
  },

  'task-detail': {
    title: 'Task Detail Help',
    description: 'Everything about a single task — edits, comments, files, time tracking.',
    sections: [
      {
        heading: 'Editing',
        items: [
          { label: 'Status', detail: 'Use the status dropdown in the sidebar to move this task through the workflow.' },
          { label: 'Priority', detail: 'Change urgency via the priority dropdown. Triggers an activity log entry.' },
          { label: 'Edit button', detail: 'Click the Edit (pencil icon) button to open the full edit form for title, description, assignees, tags, and due date.' },
          { label: 'Description', detail: 'Rich Markdown editor. Supports **bold**, _italic_, `code`, lists, and headings.' },
        ],
      },
      {
        heading: 'Comments',
        items: [
          { label: 'Posting', detail: 'Type in the comment box and press Send or Ctrl+Enter.' },
          { label: 'Reactions', detail: 'Hover a comment and click the emoji button to react.' },
          { label: 'Live Typing', detail: 'You will see a typing indicator when another user is drafting a comment on this task.' },
        ],
      },
      {
        heading: 'Subtasks',
        items: [
          { label: 'Adding', detail: 'Type a subtask title and press Enter or click the Plus button.' },
          { label: 'Completing', detail: 'Click the checkbox to toggle a subtask between Todo and Completed.' },
          { label: 'Deleting', detail: 'Hover a subtask and click the trash icon.' },
        ],
      },
      {
        heading: 'Time Tracking',
        items: [
          { label: 'Start Timer', detail: 'Click the green Play button to start tracking time on this task.' },
          { label: 'Stop Timer', detail: 'Click Stop to log the duration. It appears in the activity feed.' },
          { label: 'Manual logs', detail: 'Time logs accumulate and are visible in the Reports > Team Velocity tab.' },
        ],
      },
      {
        heading: 'Attachments',
        items: [
          { label: 'Upload', detail: 'Click the Upload button on the Attachments tab. Max file size is 10MB.' },
          { label: 'Download', detail: 'Click any attachment to download it.' },
          { label: 'Delete', detail: 'Hover an attachment and click the red trash icon.' },
        ],
      },
      {
        heading: 'GitHub Links',
        items: [
          { label: 'Automatic', detail: 'When a PR or commit references this task ID with "fixes #" or "closes #", it appears here automatically via webhook.' },
          { label: 'Status updates', detail: '"fixes #<id>" on a merged PR automatically moves this task to Completed.' },
        ],
      },
    ],
    tips: [
      'Use Ctrl+Enter to submit comments quickly.',
      'Always update the status before moving on — keeps the board accurate for your team.',
      'Assign an estimated time so Reports can show accuracy metrics.',
    ],
  },

  projects: {
    title: 'Projects Help',
    description: 'Manage all your organisation\'s projects and their lifecycle.',
    sections: [
      {
        heading: 'Project Statuses',
        items: [
          { label: 'Planning', detail: 'Project is being scoped. No active work yet.' },
          { label: 'Active', detail: 'Project is in progress. Tasks are being created and worked on.' },
          { label: 'On Hold', detail: 'Paused. No new work should start until un-paused.' },
          { label: 'Completed', detail: 'All deliverables done. Project is closed.' },
          { label: 'Cancelled', detail: 'Project was abandoned. Tasks are archived.' },
        ],
      },
      {
        heading: 'Progress',
        items: [
          { label: 'How it\'s calculated', detail: 'Progress % = (completed tasks / total tasks) × 100. It updates automatically as tasks are completed.' },
          { label: 'Manual override', detail: 'You can manually set progress in the Edit Project form.' },
        ],
      },
      {
        heading: 'Creating Projects',
        items: [
          { label: 'New Project button', detail: 'Click "+ New project" in the top right. Fill in name, description, team, and dates.' },
          { label: 'Team', detail: 'Assign a team to a project to group members responsible for it.' },
          { label: 'Client', detail: 'Optionally add a client name and contact for external-facing projects.' },
        ],
      },
      {
        heading: 'Managing Projects',
        items: [
          { label: 'Edit', detail: 'Click the ⋯ menu on any project card and select "Edit".' },
          { label: 'Delete', detail: 'Click ⋯ → "Delete". Warning: this deletes the project AND all its tasks permanently.' },
          { label: 'Open Project', detail: 'Click anywhere on a project card to open its detail page with full task breakdown.' },
        ],
      },
    ],
    tips: [
      'Set clear start and end dates for sprint planning in Reports.',
      'Use teams to group projects by department or squad.',
      'Archive completed projects instead of deleting — deleting removes all tasks.',
    ],
  },

  reports: {
    title: 'Reports & Analytics Help',
    description: 'Measure team velocity, sprint health, and project progress.',
    sections: [
      {
        heading: 'Burndown & Velocity Tab',
        items: [
          { label: 'Sprint Burndown', detail: 'Shows ideal remaining tasks (straight line) vs actual remaining. Below the ideal line is good.' },
          { label: 'Sprint Velocity', detail: 'Bar chart of completed vs total tasks per sprint. Measures throughput over time.' },
          { label: 'Sprint selector', detail: 'Use the dropdown to view historical sprint data.' },
        ],
      },
      {
        heading: 'Task Health Tab',
        items: [
          { label: 'By Status', detail: 'Visual bar chart of how many tasks are in each workflow stage right now.' },
          { label: 'By Priority', detail: 'Distribution of Critical / High / Medium / Low tasks.' },
        ],
      },
      {
        heading: 'Team Velocity Tab',
        items: [
          { label: 'Member cards', detail: 'Shows assigned, completed, and hours logged per team member.' },
          { label: 'Hours', detail: 'Populated from time log entries started/stopped via the timer on task detail pages.' },
        ],
      },
      {
        heading: 'Projects Tab',
        items: [
          { label: 'Progress bars', detail: 'Per-project completion progress based on task counts.' },
          { label: 'Status', detail: 'Shows current project lifecycle status.' },
        ],
      },
    ],
    tips: [
      'Start a Sprint via "+ Start New Sprint" and assign tasks to it for accurate burndown data.',
      'Avg Cycle Time is measured from "In Progress" to "Completed" — optimise this.',
      'If velocity is dropping sprint-over-sprint, check the Overdue count on the dashboard.',
    ],
  },

  calendar: {
    title: 'Calendar Help',
    description: 'See all tasks with due dates on a calendar view.',
    sections: [
      {
        heading: 'Viewing Tasks',
        items: [
          { label: 'Events', detail: 'Each event on the calendar is a task with a due date set.' },
          { label: 'Colours', detail: 'Events are colour-coded by priority — red for Critical/High, amber for Medium, grey for Low.' },
          { label: 'Click', detail: 'Click any event to open the task detail page.' },
        ],
      },
      {
        heading: 'Navigation',
        items: [
          { label: 'Month / Week', detail: 'Toggle between monthly and weekly views using the view buttons.' },
          { label: 'Today', detail: 'Click "Today" to jump back to the current date.' },
        ],
      },
    ],
    tips: [
      'Tasks without a due date won\'t appear here — set due dates for visibility.',
      'Use the weekly view during sprints for day-by-day planning.',
    ],
  },

  team: {
    title: 'Team Help',
    description: 'Manage members, roles, and team structure.',
    sections: [
      {
        heading: 'Roles',
        items: [
          { label: 'Owner', detail: 'Full control. Can delete the organisation. One per org.' },
          { label: 'Admin', detail: 'Can manage all settings, members, projects, and teams.' },
          { label: 'Manager', detail: 'Can create/edit projects, teams, manage tasks, and view Reports.' },
          { label: 'Member', detail: 'Can create and manage their own tasks. Cannot access Reports or Team pages.' },
        ],
      },
      {
        heading: 'Inviting Members',
        items: [
          { label: 'Invite', detail: 'Click "Invite Member" and enter their email. They receive a signup link.' },
          { label: 'Role assignment', detail: 'Assign a role during invite. Can be changed later.' },
        ],
      },
      {
        heading: 'Teams',
        items: [
          { label: 'Teams vs Members', detail: 'A Team is a group of members (e.g. "Frontend", "Backend"). Projects are assigned to teams.' },
          { label: 'Create team', detail: 'Click "+ New Team" and add members from your org.' },
        ],
      },
    ],
    tips: [
      'Use Manager role for team leads — they get Reports access without full admin power.',
      'Group members into Teams before assigning projects for cleaner tracking.',
    ],
  },

  timesheet: {
    title: 'Time Tracking Help',
    description: 'Log and review time spent on tasks across the org.',
    sections: [
      {
        heading: 'Logging Time',
        items: [
          { label: 'Timer', detail: 'Start/stop the timer from any Task Detail page using the Play button.' },
          { label: 'Manual entry', detail: 'Use the "Log Time" form to add a time log manually with a duration and date.' },
        ],
      },
      {
        heading: 'Viewing Logs',
        items: [
          { label: 'My Logs', detail: 'Default view shows your own time logs sorted by date.' },
          { label: 'All Members (Admin/Manager)', detail: 'Admins and managers can see all member logs.' },
          { label: 'Filters', detail: 'Filter by date range or project.' },
        ],
      },
    ],
    tips: [
      'Start the timer before you begin work — it\'s easy to forget after the fact.',
      'Time logs feed directly into the Team Velocity report.',
    ],
  },

  settings: {
    title: 'Settings Help',
    description: 'Manage your account, organisation, integrations, and preferences.',
    sections: [
      {
        heading: 'Profile',
        items: [
          { label: 'Name & Avatar', detail: 'Update your display name and profile picture.' },
          { label: 'Password', detail: 'Change your password from the Security section.' },
        ],
      },
      {
        heading: 'Organisation',
        items: [
          { label: 'Org Name', detail: 'Change the organisation name visible to all members.' },
          { label: 'Danger Zone', detail: 'Delete organisation permanently — irreversible. Only Owners can do this.' },
        ],
      },
      {
        heading: 'GitHub Integration',
        items: [
          { label: 'Webhook URL', detail: 'Add this URL to your GitHub repo webhook settings.' },
          { label: 'Secret', detail: 'Set the webhook secret in your GitHub repo to match what\'s in your .env GITHUB_WEBHOOK_SECRET.' },
          { label: 'Smart keywords', detail: '"fixes #<task-id>" in a commit or PR title auto-moves and closes the task.' },
        ],
      },
    ],
    tips: [
      'Set up the GitHub webhook to automate task status changes from your repo.',
      'Use Org Switcher in the sidebar to manage multiple organisations.',
    ],
  },

  notifications: {
    title: 'Notifications Help',
    description: 'Stay on top of assignments, mentions, and status changes.',
    sections: [
      {
        heading: 'Notification Types',
        items: [
          { label: 'Task Assigned', detail: 'Triggered when someone assigns you to a task.' },
          { label: 'Status Change', detail: 'Triggered when a task you are assigned to changes status.' },
          { label: 'Comment', detail: 'Triggered when someone comments on a task you are watching.' },
        ],
      },
      {
        heading: 'Managing Notifications',
        items: [
          { label: 'Bell icon', detail: 'Click the bell in the top bar to see all unread notifications.' },
          { label: 'Mark as read', detail: 'Click a notification to mark it as read and navigate to the relevant task.' },
          { label: 'Clear all', detail: 'Use "Mark all as read" to clear the unread count.' },
        ],
      },
    ],
    tips: [
      'Notifications are delivered live via WebSocket when you are online.',
      'Check the bell regularly — status changes from teammates appear here instantly.',
    ],
  },
};
