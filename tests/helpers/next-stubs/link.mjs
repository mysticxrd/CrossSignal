import { createElement } from 'react';

// An anchor with the same props, children included: enough for a server render.
export default function Link(props) {
  return createElement('a', props);
}
