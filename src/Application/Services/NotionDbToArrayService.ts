import {
    QueryDatabaseResultProps,
    QueryDatabaseResultRow,
    RetrieveDatabaseResult
} from "../../Domain/Infrastructure/Adapter/INotionAdapter";

interface NetworkConfig {
    id: string;
    name: string;
    http?: string;
    ws?: string;
    chainId?: number;
    chainName?: string;
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    };
    explorerUrl?: string;
    keywords: string;
    logo: string;
    isTestnet?: boolean;
  }

export class NotionDbToArrayService {
    toArray(retrieveResult: RetrieveDatabaseResult, rows: Array<QueryDatabaseResultRow>): Array<Array<String>> {
        const csvRows = new Array<Array<String>>();
        const configs = new Array<NetworkConfig>();

        const propNames = Object.keys(retrieveResult.properties);

        rows.forEach((row) => {
            let config: NetworkConfig = {} as NetworkConfig;

            propNames.forEach((propName) => {
                const prop = row.properties[propName];
                const value = this.takeValueFromProp(prop);
                switch (propName) {
                    case "id":
                        config.id = value;
                        break;
                    case "name":
                        config.name = value;
                        break;
                    case "type":
                        if (value === "http") {
                            config.http = "1rpc.io";
                        } else if (value === "ws") {
                            config.ws = "wss://1rpc.io";
                        } else if (value === "http & ws") {
                            config.http = "1rpc.io";
                            config.ws = "wss://1rpc.io";
                        }
                        break;
                    case "chainId":
                        if (value !== "") {
                            config.chainId = parseInt(value);
                        }
                        break;
                    case "chainName":
                        config.chainName = "1RPC " + value;
                        break;
                    case "nativeCurrency":
                        if (value !== "" && value !== undefined && value !== null) {
                            config.nativeCurrency = {
                                name: value,
                                symbol: value,
                                decimals: 18
                            }
                        }
                        break;
                    case "explorerUrl":
                        if (value !== "" && value !== undefined && value !== null) {
                            config.explorerUrl = value;
                        }
                        break;
                    case "keywords":
                        config.keywords = value;
                        break;
                    case "logo":
                        config.logo = value;
                        break;
                    case "isTestnet":
                        config.isTestnet = value === "true";
                        break;
                }
            })
            if (config.http !== "" && config.http !== undefined) {
                config.http = config.http + config.id;
            }
            if (config.ws !== "" && config.ws !== undefined) {
                config.ws = config.ws + config.id;
            }
            configs.push(config);
        })

        console.log(configs);
        return csvRows;
    }

    private takeValueFromProp(prop: QueryDatabaseResultProps) {
        switch (prop.type) {
            case "select":
                if (prop.select === null) return ""
                return prop.select.name
            case "multi_select":
                return prop.multi_select.reduce((prev, curr) => {
                    if (prev != "") prev += ',';
                    return prev + curr.name;
                }, "")
            case "checkbox":
                return prop.checkbox.toString();
            case "title":
                if (prop.title.length == 0) return "";
                return prop.title[0].plain_text
            case "rich_text":
                if (prop.rich_text.length == 0) return "";
                return prop.rich_text[0].plain_text;
            case "relation":
                return prop.relation.reduce((prev, curr) => {
                    if (prev != "") prev += ',';
                    return prev + curr.id;
                }, "")
            case "formula":
                switch (prop.formula.type) {
                    case "string":
                        return prop.formula.string
                    case "number":
                        return prop.formula.number
                    default:
                        throw new Error(`Detect unsupported property type \"${prop.formula["type"]}\"`)
                }
            case "number":
                if (prop.number === null) return "";
                return prop.number.toString();
            case "rollup":
                return this.takeValueFromProp(prop.rollup)
            case "array":
                return prop.array.reduce((prev, curr) => {
                    if (prev != "") prev += ',';
                    return prev + this.takeValueFromProp(curr);
                }, "")
            case "files":
                return prop.files.reduce((prev, curr) => {
                    if (prev != "") prev += ',';
                    switch (curr.type) {
                        case "external":
                            return prev + curr.external.url;
                        case "file":
                            return prev + curr.name;
                        default:
                            throw new Error(`Detect unsupported property type \"${curr["type"]}\"`)
                    }
                }, "")
            case "url":
                return prop.url;
            default:
                throw new Error(`Detect unsupported property type \"${prop["type"]}\"`)
        }
    }
}