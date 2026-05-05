const fs = require('fs');
const content = fs.readFileSync('src/app/trip/[id]/page.tsx', 'utf8');
const tags = [];
const regex = /<(\/?)(div|main|button|select|textarea|input|PlaceDetailModal|TransportDetailModal|EventDetailModal|CalendarView|MapSlot|AttachmentDetailModal|MediaViewer|ModalBackdrop|ModalContainer|ModalHeader|ModalContent|FormLayout|FormContainer|FormContent|FormSection|FormLabel|FormInput|FormTextarea|FormSelect|FormFooter|FormGrid|FormListItem)([\s\S]*?)?(\/?)>/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const [full, isClose, name, attrs, isSelfClose] = match;
  if (isSelfClose || (attrs && attrs.trim().endsWith('/'))) continue;
  if (isClose) {
    if (tags.length > 0 && tags[tags.length-1].name === name) {
      tags.pop();
    } else {
      if (name === 'main' && content.substring(0, match.index).split('\n').length === 2458) {
        console.log('Stack at 2458 mismatch:', tags.map(t => t.name + '(' + t.line + ')'));
      }
      // console.log('Mismatch at line', content.substring(0, match.index).split('\n').length, ': closing', name, 'but stack top is', tags.length > 0 ? tags[tags.length-1].name : 'EMPTY');
    }
  } else {
    tags.push({name, line: content.substring(0, match.index).split('\n').length});
  }
}
