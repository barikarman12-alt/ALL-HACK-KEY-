import { FastAverageColor } from 'fast-average-color';
const fac = new FastAverageColor();
fac.getColorAsync('https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200')
  .then(color => console.log(color.hex))
  .catch(console.error);
