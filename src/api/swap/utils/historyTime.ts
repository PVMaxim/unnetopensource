import dayjs from 'dayjs';
import { SWAP_SERVICES } from "../../constants-types";

const SERVICE_TIMEZONE_OFFSETS: Record<string, number> = {
    [SWAP_SERVICES.Bridgers]: -480,
    [SWAP_SERVICES.OmniBridgs]: -480,
    [SWAP_SERVICES.Changelly]: 0,
    [SWAP_SERVICES.Web3World]: 0,
};

export const convertToLocalTime = (time: string, server: string): string => {
    const userGMTOffset = new Date().getTimezoneOffset();
    const serverGMTOffset = SERVICE_TIMEZONE_OFFSETS[server] ?? 0;
    const timeZoneOffset = serverGMTOffset - userGMTOffset;
    return dayjs(time).add(timeZoneOffset, 'minute').format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Accepts a timestamp (ms), Date, or pre-formatted string and converts it
 * to a local-time string adjusted for the given swap service's timezone.
 */
export function formatHistoryDate(dateInput: Date | number | string, server: string): string {
    const time = typeof dateInput === 'string'
        ? dateInput
        : new Date(dateInput).toISOString().replace('T', ' ').split('.')[0];
    return convertToLocalTime(time, server);
}
