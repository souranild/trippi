const fs = require('fs');
const content = fs.readFileSync('src/app/trip/[id]/page.tsx', 'utf8').split('\n').slice(1347, 2315).join('\n');
const tags = [];
const regex = /<(\/?)(div|main|button|span|PlaceDetailModal|TransportDetailModal|EventDetailModal|CalendarView|MapSlot|AttachmentDetailModal|MediaViewer|ModalBackdrop|ModalContainer|ModalHeader|ModalContent|FormLayout|FormContainer|FormContent|FormSection|FormLabel|FormInput|FormTextarea|FormSelect|FormFooter|FormGrid|FormListItem)([\s\S]*?)?(\/?)>/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const [full, isClose, name, attrs, isSelfClose] = match;
  if (isSelfClose || (attrs && attrs.trim().endsWith('/'))) continue;
  if (isClose) {
    if (tags.length > 0 && tags[tags.length-1].name === name) {
      tags.pop();
    } else {
      // console.log('Mismatch at line', 1348 + content.substring(0, match.index).split('\n').length - 1, ': closing', name, 'but stack top is', tags.length > 0 ? tags[tags.length-1].name : 'EMPTY');
    }
  } else {
    tags.push({name, line: 1348 + content.substring(0, match.index).split('\n').length - 1});
  }
}
tags.forEach(t => console.log('Unclosed', t.name, 'at line', t.line));
