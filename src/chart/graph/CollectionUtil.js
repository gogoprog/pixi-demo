export default class CollectionUtil {
    static setAddAll(hostSet, clientSet) {
        if (!hostSet) {
            return new Set();
        }

        if (!clientSet) {
            return hostSet;
        }


        for (const cs of clientSet) {
            hostSet.add(cs);
        }

        return hostSet;
    }

    static setRemoveAll(hostSet, clientSet) {
        if (!hostSet) {
            return new Set();
        }

        if (!clientSet) {
            return hostSet;
        }

        for (const cs of clientSet) {
            hostSet.delete(cs);
        }

        return hostSet;
    }

    static mapAddAll(hostMap, clientMap) {
        if (!hostMap) {
            return new Map();
        }

        if (!clientMap) {
            return hostMap;
        }

        for (const [key, value] of clientMap) {
            hostMap.set(key, value);
        }

        return hostMap;
    }

    static mapRemoveAll(hostMap, clientMap) {
        if (!hostMap) {
            return new Map();
        }

        if (!clientMap) {
            return hostMap;
        }

        for (const [key] of clientMap.keys()) {
            hostMap.delete(key);
        }

        return hostMap;
    }
}
