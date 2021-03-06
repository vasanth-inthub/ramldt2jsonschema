/* global describe, it, context, beforeEach, afterEach */

const { expect } = require('chai')
const rewire = require('rewire')
const dt2js = rewire('../../src/dt2js')

describe('dt2js.fixFileTypeProperties()', function () {
  const fixFileTypeProperties = dt2js.__get__('fixFileTypeProperties')
  it('should ignore non-objects', function () {
    const data = ['foo', 3, ['zoo'], undefined, null, 3.4]
    data.forEach(el => {
      expect(fixFileTypeProperties(el)).to.equal(el)
    })
  })
  it('should ignore objects without "type: file" pair', function () {
    const data = { foo: 1 }
    expect(fixFileTypeProperties(data)).to.equal(data)
  })
  it('should convert object with "type: file" to draft4 binary', function () {
    const data = {
      type: 'file'
    }
    expect(fixFileTypeProperties(data)).to.deep.equal({
      type: 'string',
      media: {
        binaryEncoding: 'binary'
      }
    })
  })
  context('when object contains "x-amf-fileTypes" property', function () {
    context('when property has an empty value', function () {
      it('should not add anyOf definition', function () {
        const data = {
          type: 'file',
          'x-amf-fileTypes': []
        }
        expect(fixFileTypeProperties(data)).to.deep.equal({
          type: 'string',
          media: {
            binaryEncoding: 'binary'
          }
        })
      })
    })
    it('should convert that property to media.anyOf', function () {
      const data = {
        type: 'file',
        'x-amf-fileTypes': ['image/png', 'image/jpg']
      }
      expect(fixFileTypeProperties(data)).to.deep.equal({
        type: 'string',
        media: {
          binaryEncoding: 'binary',
          anyOf: [
            { mediaType: 'image/png' },
            { mediaType: 'image/jpg' }
          ]
        }
      })
    })
  })
})

describe('dt2js.removeXAmfProperties()', function () {
  const removeXAmfProperties = dt2js.__get__('removeXAmfProperties')
  it('should ignore non-objects', function () {
    const data = ['foo', 3, ['zoo'], undefined, null, 3.4]
    data.forEach(el => {
      expect(removeXAmfProperties(el)).to.equal(el)
    })
  })
  it('should remove "x-amf-" prefixes from properties names', function () {
    const data = {
      name: 'john',
      'x-amf-age': 123
    }
    expect(removeXAmfProperties(data)).to.deep.equal({
      name: 'john',
      age: 123
    })
  })
})

describe('dt2js.patchRamlData()', function () {
  const patchRamlData = dt2js.__get__('patchRamlData')
  it('should replace RAML tag and add an endpoint', function () {
    const ramlData = `#%RAML 1.0 Library
types:
  Cat:
    type: string`
    expect(patchRamlData(ramlData, 'Cat')).to.equal(`#%RAML 1.0
types:
  Cat:
    type: string

/for/conversion/Cat:
  get:
    responses:
      200:
        body:
          application/json:
            type: Cat`)
  })
})

describe('dt2js.migrateDraft()', function () {
  const schema04 = {
    id: '1',
    $schema: 'http://json-schema.org/draft-04/schema#',
    properties: {
      name: {
        type: 'string',
        enum: ['John']
      }
    }
  }
  const migrateDraft = dt2js.__get__('migrateDraft')
  context('when draft is invalid', function () {
    it('should throw an error', function () {
      expect(_ => migrateDraft(schema04, '123')).to.throw(Error)
    })
  })
  context('when draft is 04', function () {
    it('should return schema as is', function () {
      expect(migrateDraft(schema04, '04')).to.deep.equal(schema04)
    })
  })
  context('when draft is 06', function () {
    it('should convert schema to draft06', function () {
      expect(migrateDraft(schema04, '06')).to.deep.equal({
        $id: '1',
        $schema: 'http://json-schema.org/draft-06/schema#',
        properties: {
          name: {
            type: 'string',
            const: 'John'
          }
        }
      })
    })
  })
  context('when draft is 07', function () {
    it('should convert schema to draft06 and change $schema to 07', function () {
      expect(migrateDraft(schema04, '07')).to.deep.equal({
        $id: '1',
        $schema: 'http://json-schema.org/draft-07/schema#',
        properties: {
          name: {
            type: 'string',
            const: 'John'
          }
        }
      })
    })
  })
})

describe('dt2js.fixStructureInconsistencies()', function () {
  const fixStructureInconsistencies = dt2js.__get__('fixStructureInconsistencies')
  it('should ignore non-objects', function () {
    const data = ['foo', 3, ['zoo'], undefined, null, 3.4]
    data.forEach(el => {
      expect(fixStructureInconsistencies(el)).to.equal(el)
    })
  })
  it('should ignore objects without "examples" property', function () {
    const data = { foo: 1 }
    expect(fixStructureInconsistencies(data)).to.equal(data)
  })
  it('should convert object with "examples" object to array', function () {
    const data = {
      examples: {
        catone: 'CatOne',
        dogone: 'DogOne'
      }
    }
    expect(fixStructureInconsistencies(data)).to.deep.equal({
      examples: ['CatOne', 'DogOne']
    })
  })
  it('should keep object with "examples" array as is', function () {
    const data = {
      examples: ['CatOne', 'DogOne']
    }
    expect(fixStructureInconsistencies(data)).to.deep.equal({
      examples: ['CatOne', 'DogOne']
    })
  })
})

describe('dt2js.validateJsonSchema()', function () {
  const validateJsonSchema = dt2js.__get__('validateJsonSchema')
  context('when invalid draft-04 json schema passed', function () {
    it('should validate it and throw an error', function () {
      const schema = {
        $schema: 'http://json-schema.org/draft-04/schema',
        required: 'asdasdasd'
      }
      expect(_ => validateJsonSchema(schema)).to.throw(
        Error,
        'Invalid JSON Schema: data.required should be array')
    })
  })
  context('when valid draft-04 json schema passed', function () {
    it('should not throw an error', function () {
      const schema = {
        $schema: 'http://json-schema.org/draft-04/schema',
        required: ['asdasdasd']
      }
      expect(_ => validateJsonSchema(schema)).to.not.throw(
        Error,
        'Invalid JSON Schema: data.required should be array')
    })
  })
  it('should support draft-06 schema', function () {
    const schema = { $schema: 'http://json-schema.org/draft-06/schema' }
    expect(_ => validateJsonSchema(schema)).to.not.throw(Error)
  })
  it('should support draft-07 schema', function () {
    const schema = { $schema: 'http://json-schema.org/draft-07/schema' }
    expect(_ => validateJsonSchema(schema)).to.not.throw(Error)
  })
  it('should not support other drafts', function () {
    const schema = { $schema: 'http://json-schema.org/draft-03/schema' }
    expect(_ => validateJsonSchema(schema)).to.throw(
      Error,
      'no schema with key or ref "http://json-schema.org/draft-03/schema')
  })
  context('when ajv is not installed', function () {
    let revert
    beforeEach(function () {
      revert = dt2js.__set__({
        require: function (name) { throw new Error('hi') }
      })
    })
    afterEach(function () { revert() })
    it('should throw an error', function () {
      const schema = {
        $schema: 'http://json-schema.org/draft-04/schema',
        required: ['asdasdasd']
      }
      expect(_ => validateJsonSchema(schema)).to.throw(
        Error,
        'Validation requires "ajv" to be installed. hi')
    })
  })
})
