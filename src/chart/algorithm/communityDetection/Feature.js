/**
 * 实体的特征对象
 */
export default class Feature {
    constructor() {
        this.sparseVecSorted = [];
    }

    getSparseVecSorted() {
        return this.sparseVecSorted;
    }

    addAdjoinNode2SparseVecSorted(index) {
        this.sparseVecSorted.push(index);
    }

    /**
     * 对特征进行排序
     */
    sort() {
        this.sparseVecSorted.sort((x, y) => {
            if (x > y) {
                return 1;
            }
            return -1;
        });
    }

    /**
     * 计算指定实体特征与当前实体的特征度量
     * @param feature
     * @returns {number}
     */
    dist(feature) {
        let dist = 2;
        let i = 0;
        let j = 0;
        const anotherSparseVecSorted = feature.getSparseVecSorted();
        let thisVecElement = this.sparseVecSorted[i];
        let anotherVecElement = anotherSparseVecSorted[j];
        i++;
        j++;
        const thisSparseVecSortedNum = this.sparseVecSorted.length;
        const anotherSparseVecSortedNum = anotherSparseVecSorted.length;
        while (i < thisSparseVecSortedNum || j < anotherSparseVecSortedNum) {
            if (thisVecElement === anotherVecElement) {
                dist -= 2;
                if (i < thisSparseVecSortedNum) {
                    dist++;
                    thisVecElement = this.sparseVecSorted[i];
                    i++;
                }
                if (j < anotherSparseVecSortedNum) {
                    dist++;
                    anotherVecElement = anotherSparseVecSorted[j];
                    j++;
                }
                continue;
            }

            if (i >= thisSparseVecSortedNum) {
                dist++;
                anotherVecElement = anotherSparseVecSorted[j];
                j++;
                continue;
            }
            if (j >= anotherSparseVecSortedNum) {
                dist++;
                thisVecElement = this.sparseVecSorted[i];
                i++;
                continue;
            }

            if (thisVecElement < anotherVecElement) {
                thisVecElement = this.sparseVecSorted[i];
                i++;
                dist++;
            } else {
                anotherVecElement = anotherSparseVecSorted[j];
                j++;
                dist++;
            }
        }
        if (thisVecElement === anotherVecElement) {
            dist -= 2;
        }
        return dist;
    }
}
