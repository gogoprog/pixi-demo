import Papa from "papaparse";

export default function () {
    return new Promise((resolve => {
        Papa.parse("/static/data/air-routes-latest-nodes.csv", {
            download: true,
            header: true,
            transformHeader: function(h) {
                h = h.startsWith('~') ? h.substring(1) : h;

                const delimiterIndex = h.indexOf(':');
                return delimiterIndex < 0 ? h : h.substring(0, delimiterIndex);
            },
            complete: function (nodes) {

                Papa.parse("/static/data/air-routes-latest-edges-tiny.csv", {
                    download: true,
                    header: true,
                    transformHeader: function(h) {
                        h = h.startsWith('~') ? h.substring(1) : h;

                        const delimiterIndex = h.indexOf(':');
                        return delimiterIndex < 0 ? h : h.substring(0, delimiterIndex);
                    },
                    complete: function (edges) {

                        const entities = nodes.data.map((node) => {
                            return  {
                                type: "plane",
                                id: node.id,
                                label: node.label,
                                properties: {},
                            }
                        });

                        const links = edges.data.map((edge) => {
                            return  {
                                type: "plane_link",
                                id: edge.id,
                                label: edge.label,
                                sourceEntity: edge.from,
                                targetEntity: edge.to,
                                directivity: "SourceToTarget",
                                properties: {},
                            }
                        });

                        resolve({
                            entities,
                            links
                        });
                    }
                })
            }
        })
    }));
}
