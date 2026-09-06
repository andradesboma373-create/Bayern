const buffer = Buffer.from("hello world");
const blob = new Blob([buffer], { type: 'text/plain' });
const fd = new FormData();
fd.append('photo', blob, 'test.txt');
console.log(fd.get('photo'));
