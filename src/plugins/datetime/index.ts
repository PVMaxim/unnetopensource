export const format = (date: Date, exp: string): string => exp.replace(/\\?{.*?}/g, key => {
	if (key.startsWith('\\')) {
		return key.slice(1);
	}

	switch (key) {
		case '{yyyy}':
			return `${date.getFullYear()}`;
		case '{yy}':
			return `${date.getFullYear()}`.slice(-2);
		case '{MM}':
			return `${(date.getMonth() + 1)}`.padStart(2, '0');
		case '{MMM}':
			return date.toLocaleString('en', {month: 'short'});
		case '{MMMM}':
			return date.toLocaleString('en', {month: 'long'});
		case '{Ms}':
			return `${date.toLocaleString('en-GB', { month: 'short' })}`;
		case '{dd}':
			return `${date.getDate()}`.padStart(2, '0');
		case '{HH}':
			return `${date.getHours()}`.padStart(2, '0');
		case '{mm}':
			return `${date.getMinutes()}`.padStart(2, '0');
		case '{ss}':
			return `${date.getSeconds()}`.padStart(2, '0');
		case '{SSS}':
			return `${date.getMilliseconds()}`.padStart(3, '0');
		default:
			return '';
	}
});

export {default as localeFormat} from './locale';