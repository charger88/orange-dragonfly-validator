const fs = require('fs')
if (process.argv.length !== 3) throw new Error('Please, provide input file')
const input_data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (!input_data) throw new Error('File doesn\'t contain valid JSON')

function process_schema (data, prefix = '') {
  for (const [key, item] of Object.entries(data)) {
    const types = item.hasOwnProperty('type') ? (typeof item.type === 'string' ? [item.type] : item.type) : []
    const default_value = item.required && item.hasOwnProperty('default') ? ('`' + (typeof item.default === 'object' ? JSON.stringify(item.default) : item.default) + '`') : ''
    const required = item.required && !item.hasOwnProperty('default')
    const description = []
    if (required) description.push('Required')
    if (item.children && item.children.hasOwnProperty('@')) description.push(item.children['@'].strict === false ? 'Non-described keys are allowed' : 'Only described keys are allowed')
    if (item.min) description.push(`Minimal ${types[0] === 'string' ? 'length' : 'value'} - ${item.min}`)
    if (item.max) description.push(`Maximal ${types[0] === 'string' ? 'length' : 'value'} - ${item.max}`)
    let name = key;
    if (prefix.length) {
      if (name === '@') {
        continue;
      } else if (name === '#') {
        name = `${prefix.slice(0, -1)} (keys)`
      } else {
        name = `${prefix}${name}`
      }
    }
    if (item.pattern) description.push(`Pattern \`${item.pattern}\``)
    console.log(`| ${required ? ('__' + name + '__') : name} | ${types.join(', ')} | ${default_value} | ${description.length ? description.join('; ') : '...'} |`)
    if (item.hasOwnProperty('children')) process_schema(item.children, `${name}.`)
  }
}

console.log('| Parameter | Type | Default | Description |')
console.log('|---|---|---|---|')
process_schema(input_data)