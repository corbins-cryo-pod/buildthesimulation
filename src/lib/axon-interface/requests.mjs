/** Only the current worker request may update the experiment. */
export function acceptWorkerMessage(message,currentId){return !!message&&Number.isSafeInteger(message.id)&&message.id===currentId&&['progress','result','study','error'].includes(message.type);}

