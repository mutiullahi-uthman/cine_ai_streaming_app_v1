export type WorkflowNotificationType =
  | 'film-ready'
  | 'film-published'
  | 'processing-failed'
  | 'upload-expired';

interface NotificationContent {
  subject: string;
  heading: string;
  message: string;
}

const CONTENT: Record<WorkflowNotificationType, NotificationContent> = {
  'film-ready': {
    subject: 'Your film is ready',
    heading: 'Your film is ready to premiere',
    message: 'Your film has finished processing and is ready.',
  },
  'film-published': {
    subject: 'Your film premiere is live',
    heading: 'Your film is now live',
    message: 'Your scheduled premiere has started and playback is available.',
  },
  'processing-failed': {
    subject: 'Film processing failed',
    heading: 'We could not finish processing your film',
    message: 'Processing failed after the available retry attempts.',
  },
  'upload-expired': {
    subject: 'Your upload session expired',
    heading: 'Your upload session expired',
    message: 'The upload was not completed before its expiration time.',
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string);
}

export function createWorkflowNotification(params: {
  type: WorkflowNotificationType;
  filmTitle: string;
}) {
  const content = CONTENT[params.type];
  const filmTitle = params.filmTitle.trim();
  const safeFilmTitle = escapeHtml(filmTitle);
  const subjectFilmTitle = filmTitle.replace(/[\r\n]/g, ' ').slice(0, 200);
  return {
    subject: `${content.subject}: ${subjectFilmTitle}`,
    text: `${content.heading}\n\n${content.message}\n\nFilm: ${filmTitle}`,
    html: [
      '<!doctype html>',
      '<html><body>',
      `<h1>${content.heading}</h1>`,
      `<p>${content.message}</p>`,
      `<p>Film: <strong>${safeFilmTitle}</strong></p>`,
      '</body></html>',
    ].join(''),
  };
}
