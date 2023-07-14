import plugin from './index'
import Wrapper from '@velocity/ucv-ext-npm-wrapper'
import log4js from '@velocity/logger'

let instance = new Wrapper(plugin, log4js)

instance.run()
