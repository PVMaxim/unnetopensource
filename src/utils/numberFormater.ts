export const numberFormatter = (number: string | number, fractionDigits: number = 3): string => {
    const value = Number(number);
    const res = value.toString().split('.');

    if(value < 0.001){
       return value.toFixed(6).toString();
    }

    if (res.length > 1 && res[1].length > fractionDigits) {
      return value.toFixed(fractionDigits).toString();
    }
    return value.toString();
  
}