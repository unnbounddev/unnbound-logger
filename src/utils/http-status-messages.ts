interface HttpStatus {
  message: string;
  description: string;
}

export const httpStatusDetails: { [key: number]: HttpStatus } = {
  100: { message: 'Continue', description: 'The server has received the request headers, and the client should proceed to send the request body' },
  101: { message: 'Switching Protocols', description: 'The requester has asked the server to switch protocols' },
  103: { message: 'Early Hints', description: 'Used with the Link header to allow the browser to start preloading resources while the server prepares a response' },
  200: { message: 'OK', description: 'The request is OK' },
  201: { message: 'Created', description: 'The request has been fulfilled, and a new resource is created' },
  202: { message: 'Accepted', description: 'The request has been accepted for processing, but the processing has not been completed' },
  203: { message: 'Non-Authoritative Information', description: 'The request has been successfully processed, but is returning information that may be from another source' },
  204: { message: 'No Content', description: 'The request has been successfully processed, but is not returning any content' },
  205: { message: 'Reset Content', description: 'The request has been successfully processed, but is not returning any content, and requires that the requester reset the document view' },
  206: { message: 'Partial Content', description: 'The server is delivering only part of the resource due to a range header sent by the client' },
  300: { message: 'Multiple Choices', description: 'A link list. The user can select a link and go to that location. Maximum five addresses' },
  301: { message: 'Moved Permanently', description: 'The requested page has moved to a new URL' },
  302: { message: 'Found', description: 'The requested page has moved temporarily to a new URL' },
  303: { message: 'See Other', description: 'The requested page can be found under a different URL' },
  304: { message: 'Not Modified', description: 'Indicates the requested page has not been modified since last requested' },
  307: { message: 'Temporary Redirect', description: 'The requested page has moved temporarily to a new URL' },
  308: { message: 'Permanent Redirect', description: 'The requested page has moved permanently to a new URL' },
  400: { message: 'Bad Request', description: 'The request cannot be fulfilled due to bad syntax' },
  401: { message: 'Unauthorized', description: 'The request was a legal request, but the server is refusing to respond to it. For use when authentication is possible but has failed or not yet been provided' },
  402: { message: 'Payment Required', description: 'Reserved for future use' },
  403: { message: 'Forbidden', description: 'The request was a legal request, but the server is refusing to respond to it' },
  404: { message: 'Not Found', description: 'The requested page could not be found but may be available again in the future' },
  405: { message: 'Method Not Allowed', description: 'A request was made of a page using a request method not supported by that page' },
  406: { message: 'Not Acceptable', description: 'The server can only generate a response that is not accepted by the client' },
  407: { message: 'Proxy Authentication Required', description: 'The client must first authenticate itself with the proxy' },
  408: { message: 'Request Timeout', description: 'The server timed out waiting for the request' },
  409: { message: 'Conflict', description: 'The request could not be completed because of a conflict in the request' },
  410: { message: 'Gone', description: 'The requested page is no longer available' },
  411: { message: 'Length Required', description: 'The "Content-Length" is not defined. The server will not accept the request without it' },
  412: { message: 'Precondition Failed', description: 'The precondition given in the request evaluated to false by the server' },
  413: { message: 'Request Too Large', description: 'The server will not accept the request, because the request entity is too large' },
  414: { message: 'Request-URI Too Long', description: 'The server will not accept the request, because the URI is too long. Occurs when you convert a POST request to a GET request with a long query information' },
  415: { message: 'Unsupported Media Type', description: 'The server will not accept the request, because the media type is not supported' },
  416: { message: 'Range Not Satisfiable', description: 'The client has asked for a portion of the file, but the server cannot supply that portion' },
  417: { message: 'Expectation Failed', description: 'The server cannot meet the requirements of the Expect request-header field' },
  500: { message: 'Internal Server Error', description: 'A generic error message, given when no more specific message is suitable' },
  501: { message: 'Not Implemented', description: 'The server either does not recognize the request method, or it lacks the ability to fulfill the request' },
  502: { message: 'Bad Gateway', description: 'The server was acting as a gateway or proxy and received an invalid response from the upstream server' },
  503: { message: 'Service Unavailable', description: 'The server is currently unavailable (overloaded or down)' },
  504: { message: 'Gateway Timeout', description: 'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server' },
  505: { message: 'HTTP Version Not Supported', description: 'The server does not support the HTTP protocol version used in the request' },
  511: { message: 'Network Authentication Required', description: 'The client needs to authenticate to gain network access' },
};

export function getStatusMessage(statusCode: number): string {
  const status = httpStatusDetails[statusCode];
  if (status) {
    return `${status.message} - ${status.description}`;
  }
  return 'Unknown Status';
} 