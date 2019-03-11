const Operator = {
    gt: 'gt',
    ngt: 'ngt',
    lt: 'lt',
    nlt: 'nlt',
    eq: 'eq',
    ne: 'ne',
    bool: 'bool',
    in: 'in',
    nin: 'nin',
    is: 'is',
    not: 'not',
    before: 'before',
    after: 'after',
    between: 'between',
    contains: 'contains',
    startsWith: 'startsWith',
    endsWith: 'endsWith',
    notStartsWith: 'notStartsWith',
    notEndsWith: 'notEndsWith',
};

Object.freeze(Operator);
export default Operator;
