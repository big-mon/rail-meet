import network from './network.json' with {type:'json'};
import {createApi} from './api.mjs';
export default {fetch:createApi(network)};
