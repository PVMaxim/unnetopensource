

export function add0xPrefix(src: string): string {
    if( !src.toLowerCase().startsWith("0x") ) {
        return `0x${src}`;
    }

    return src;
}
