import { readFileSync } from 'fs'
import {
  parse,
  GraphQLSchema,
  buildClientSchema,
  buildASTSchema
} from 'graphql'
import * as gql from 'graphql-tag'
import { Types, mergeOutputs } from '@graphql-codegen/plugin-helpers'
import { DocumentMode } from '@graphql-codegen/visitor-plugin-common'
import { Types, mergeOutputs } from '@graphql-codegen/plugin-helpers'
import { extract, parseWithComments } from 'jest-docblock'
import { plugin, ReactApolloRawPluginConfig } from '../src/index'
import { validateFlow } from './validate-flow'
import '@graphql-codegen/testing'

describe('Flow React Apollo', () => {
  const schema = buildClientSchema(
    JSON.parse(
      readFileSync('./tests/schema.json').toString()
    )
  )

  const basicDoc = parse(/* GraphQL */ `
    query test {
      feed {
        id
        commentCount
        repository {
          full_name
          html_url
          owner {
            avatar_url
          }
        }
      }
    }
  `)
  const mutationDoc = parse(/* GraphQL */ `
    mutation test($name: String) {
      submitRepository(repoFullName: $name) {
        id
      }
    }
  `)

  const subscriptionDoc = parse(/* GraphQL */ `
    subscription test($name: String) {
      commentAdded(repoFullName: $name) {
        id
      }
    }
  `)

  describe('Helpers', () => {
    it('should add ExtractReturnType helper', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toContain(
        `type ExtractReturnType<V> = (() => V) => V;`
      )
      validateFlow(content)
    })
  })

  describe('Imports', () => {
    it('should import React and ReactApollo dependencies', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.prepend).toContain(
        `import * as ApolloReactComponents from '@apollo/react-components';`
      )
      expect(content.prepend).toContain(`import React from 'react';`)
      expect(content.prepend).toContain(`import gql from 'graphql-tag';`)

      validateFlow(content)
    })

    it('should import DocumentNode when using noGraphQLTag', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          noGraphQLTag: true
        },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import { DocumentNode } from 'graphql';`
      )
      expect(content.prepend).not.toContain(`import gql from 'graphql-tag';`)

      validateFlow(content)
    })

    it(`should use gql import from gqlImport config option`, async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { gqlImport: 'graphql.macro#gql' },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(`import { gql } from 'graphql.macro';`)
      // console.log(content)
      validateFlow(content)
    })

    it(`tests for dedupeOperationSuffix`, async () => {
      const ast = parse(/* GraphQL */ `
        query notificationsQuery {
          notifications {
            id
          }
        }
      `)
      const ast2 = parse(/* GraphQL */ `
        query notifications {
          notifications {
            id
          }
        }
      `)

      expect(
        ((await plugin(
          schema,
          [{ filePath: 'test-file.js', content: ast }],
          {},
          { outputFile: '' }
        )) as any).content
      ).toContain(
        'ApolloReactCommon.QueryResult<NotificationsQueryQuery, NotificationsQueryQueryVariables>;'
      )
      expect(
        ((await plugin(
          schema,
          [{ filePath: 'test-file.js', content: ast }],
          { dedupeOperationSuffix: false },
          { outputFile: '' }
        )) as any).content
      ).toContain(
        'ApolloReactCommon.QueryResult<NotificationsQueryQuery, NotificationsQueryQueryVariables>'
      )
      expect(
        ((await plugin(
          schema,
          [{ filePath: 'test-file.js', content: ast }],
          { dedupeOperationSuffix: true },
          { outputFile: '' }
        )) as any).content
      ).toContain(
        'ApolloReactCommon.QueryResult<NotificationsQuery, NotificationsQueryVariables>'
      )
      expect(
        ((await plugin(
          schema,
          [{ filePath: 'test-file.js', content: ast2 }],
          { dedupeOperationSuffix: true },
          { outputFile: '' }
        )) as any).content
      ).toContain(
        'ApolloReactCommon.QueryResult<NotificationsQuery, NotificationsQueryVariables>'
      )
      expect(
        ((await plugin(
          schema,
          [{ filePath: 'test-file.js', content: ast2 }],
          { dedupeOperationSuffix: false },
          { outputFile: '' }
        )) as any).content
      ).toContain(
        'ApolloReactCommon.QueryResult<NotificationsQuery, NotificationsQueryVariables>'
      )
    })

    it('should import ApolloReactHooks dependencies', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withHooks: true },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactHooks from '@apollo/react-hooks';`
      )

      validateFlow(content)
    })

    it('should import ApolloReactHooks from apolloReactHooksImportFrom config option', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withHooks: true, apolloReactHooksImportFrom: 'react-apollo-hooks' },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactHooks from 'react-apollo-hooks';`
      )

      validateFlow(content)
    })

    it('should import ApolloReactCommon from apolloReactCommonImportFrom config option', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          withHooks: true,
          apolloReactCommonImportFrom: 'custom-apollo-react-common'
        },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from 'custom-apollo-react-common';`
      )

      validateFlow(content)
    })

    it('should skip import React and ApolloReactComponents if only hooks are used', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          withHooks: true,
          withHOC: false,
          withComponent: false,
          withMutationFn: false,
          withResultType: false
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactComponents from '@apollo/react-components'`
      )
      expect(content.prepend).not.toContain(`import * as React from 'react'`)

      validateFlow(content)
    })
  })

  describe('Fragments', () => {
    it('Should generate basic fragments documents correctly', async () => {
      const docs = [
        {
          filePath: 'a.graphql',
          content: parse(/* GraphQL */ `
            fragment MyFragment on Repository {
              full_name
            }
            query {
              feed {
                id
              }
            }
          `)
        }
      ]
      const result = (await plugin(
        schema,
        docs,
        {},
        { outputFile: '' }
      )) as Types.ComplexPluginOutput

      expect(result.content).toBeSimilarStringTo(`
        export const MyFragmentFragmentDoc = gql\`
          fragment MyFragment on Repository {
            full_name
          }
        \``)

      validateFlow(result)
    })

    it('should generate Document variables for inline fragments', async () => {
      const repositoryWithOwner = gql`
        fragment RepositoryWithOwner on Repository {
          full_name
          html_url
          owner {
            avatar_url
          }
        }
      `
      const feedWithRepository = gql`
        fragment FeedWithRepository on Entry {
          id
          commentCount
          repository(search: "phrase") {
            ...RepositoryWithOwner
          }
        }
        ${repositoryWithOwner}
      `
      const myFeed = gql`
        query MyFeed {
          feed {
            ...FeedWithRepository
          }
        }
        ${feedWithRepository}
      `

      const docs = [{ filePath: '', content: myFeed }]

      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content)
        .toBeSimilarStringTo(`export const FeedWithRepositoryFragmentDoc = gql\`
        fragment FeedWithRepository on Entry {
          id
          commentCount
          repository(search: "phrase") {
            ...RepositoryWithOwner
          }
        }
        \${RepositoryWithOwnerFragmentDoc}\`;`)

      expect(content.content)
        .toBeSimilarStringTo(`export const RepositoryWithOwnerFragmentDoc = gql\`
        fragment RepositoryWithOwner on Repository {
          full_name
          html_url
          owner {
            avatar_url
          }
        }
        \``)

      expect(content.content)
        .toBeSimilarStringTo(`export const MyFeedDocument = gql\`
          query MyFeed {
            feed {
              ...FeedWithRepository
            }
          }
          \${FeedWithRepositoryFragmentDoc}\``
        )
      validateFlow(content)
    })

    it('should avoid generating duplicate fragments', async () => {
      const simpleFeed = gql`
        fragment Item on Entry {
          id
        }
      `
      const myFeed = gql`
        query MyFeed {
          feed {
            ...Item
          }
          allFeeds: feed {
            ...Item
          }
        }
      `
      const documents = [simpleFeed, myFeed]
      const docs = documents.map((content) => ({ content, filePath: '' }))
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
        export const MyFeedDocument = gql\`
        query MyFeed {
            feed {
              ...Item
            }
            allFeeds: feed {
              ...Item
            }
          }
          \${ItemFragmentDoc}\``)
      expect(content.content).toBeSimilarStringTo(`
              export const ItemFragmentDoc = gql\`
              fragment Item on Entry {
                id
              }
      \``)

      validateFlow(content)
    })

    it('Should generate fragments in proper order (when one depends on other)', async () => {
      const myFeed = gql`
        fragment FeedWithRepository on Entry {
          id
          repository {
            ...RepositoryWithOwner
          }
        }
        fragment RepositoryWithOwner on Repository {
          full_name
        }
        query MyFeed {
          feed {
            ...FeedWithRepository
          }
        }
      `
      const documents = [myFeed]
      const docs = documents.map((content) => ({ content, filePath: '' }))
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      const feedWithRepositoryPos = content.content.indexOf(
        'fragment FeedWithRepository'
      )
      const repositoryWithOwnerPos = content.content.indexOf(
        'fragment RepositoryWithOwner'
      )
      expect(repositoryWithOwnerPos).toBeLessThan(feedWithRepositoryPos)

      validateFlow(content)
    })
  })

  describe('Component', () => {
    it('should generate Document variable', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
          export const TestDocument =  gql\`
          query test {
            feed {
              id
              commentCount
              repository {
                full_name
                html_url
                owner {
                  avatar_url
                }
              }
            }
          }
          \`;
        `)

      validateFlow(content)
    })

    it('should generate Document variable with noGraphQlTag', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          noGraphQLTag: true
        },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(
        `export const TestDocument: DocumentNode = {"kind":"Document","defin`
      )

      // For issue #1599 - make sure there are not `loc` properties
      expect(content.content).not.toContain(`loc":`)
      expect(content.content).not.toContain(`loc':`)

      validateFlow(content)
    })

    it('should generate Component', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
      export type TestComponentProps = $Diff<ApolloReactComponents.QueryComponentOptions<TestQuery, TestQueryVariables>, {| query: * |}>;
      `)

      expect(content.content).toBeSimilarStringTo(`
      export const TestComponent = (props: TestComponentProps) =>
      (
          <ApolloReactComponents.Query query={TestDocument} {...props} />
      );
      `)

      validateFlow(content)
    })

    it('should generate a component with a custom suffix when specified', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { componentSuffix: 'Q' },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
      export type TestQProps = $Diff<ApolloReactComponents.QueryComponentOptions<TestQuery, TestQueryVariables>, {| query: * |}>;
      `)
      expect(content.content).toBeSimilarStringTo(`
      export const TestQ = (props: TestQProps) =>
      (
          <ApolloReactComponents.Query query={TestDocument} {...props} />
      );
      `)

      validateFlow(content)
    })

    it('should not generate Component', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withComponent: false },
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toContain(`export class TestComponent`)
      validateFlow(content)
    })

    it('should make variables property required if any of variable definitions is non-null', async () => {
      const docs = [
        {
          filePath: '',
          content: gql`
            query Test($foo: String!) {
              test(foo: $foo)
            }
          `
        }
      ]
      const schema = buildASTSchema(gql`
        type Query {
          test(foo: String!): Boolean
        }
      `)
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
      export type TestComponentProps = $Diff<ApolloReactComponents.QueryComponentOptions<TestQuery, TestQueryVariables>, {| query: * |}> & ({ variables: TestQueryVariables; skip?: boolean; } | { skip: boolean; })
      `)

      expect(content.content).toBeSimilarStringTo(`
      export const TestComponent = (props: TestComponentProps) =>
      (
          <ApolloReactComponents.Query query={TestDocument} {...props} />
      );
      `)

      validateFlow(content)
    })

    it('should make variables property optional if operationType is mutation', async () => {
      const docs = [
        {
          filePath: '',
          content: gql`
            mutation Test($foo: String!) {
              test(foo: $foo)
            }
          `
        }
      ]
      const schema = buildASTSchema(gql`
        type Mutation {
          test(foo: String!): Boolean
        }
      `)
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.js'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
      export type TestComponentProps = $Diff<ApolloReactComponents.MutationComponentOptions<TestMutation, TestMutationVariables>, {| mutation: * |}>;
      `)
      expect(content.content).toBeSimilarStringTo(`
      export const TestComponent = (props: TestComponentProps) => (
        <ApolloReactComponents.Mutation mutation={TestDocument} {...props} />
      );`)
      validateFlow(content)
    })

    it('should not add typesPrefix to Component', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { typesPrefix: 'I' },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toContain(`export class ITestComponent`)
      validateFlow(content)
    })
  })

  describe('HOC', () => {
    it('should generate HOCs', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(
        `export type TestProps<TChildProps = {}> = ApolloReactHoc.DataProps<TestQuery, TestQueryVariables> & TChildProps;`
      )

      expect(content.content)
        .toBeSimilarStringTo(`export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestQuery,
        TestQueryVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withQuery<TProps, TestQuery, TestQueryVariables, TestProps<TChildProps>>(TestDocument, {
            alias: 'test',
            ...operationOptions
          });
      }`)

      validateFlow(content)
    })

    it('should generate HOC props with correct operation result type name', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { operationResultSuffix: 'Response' },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(
        `export type TestProps<TChildProps = {}> = ApolloReactHoc.DataProps<TestQueryResponse, TestQueryVariables> & TChildProps;`
      )

      validateFlow(content)
    })

    it('should not generate HOCs', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withHOC: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toContain(`export type TestProps`)
      expect(content.content).not.toContain(`export function withTest`)
      validateFlow(content)
    })

    it('should not add typesPrefix to HOCs', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { typesPrefix: 'I' },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toContain(`export type ITestProps`)
      expect(content.content).toContain(`export function withTest`)
      validateFlow(content)
    })
    it('should generate mutation function signature correctly', async () => {
      const docs = [
        {
          filePath: '',
          content: parse(/* GraphQL */ `
            mutation submitComment(
              $repoFullName: String!
              $commentContent: String!
            ) {
              submitComment(
                repoFullName: $repoFullName
                commentContent: $commentContent
              ) {
                id
              }
            }
          `)
        }
      ]
      const content = (await plugin(
        schema,
        docs,
        { withMutationFn: true },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toContain(
        `export type SubmitCommentMutationFn = ApolloReactCommon.MutationFunction<SubmitCommentMutation, SubmitCommentMutationVariables>;`
      )
      validateFlow(content)
    })
  })

  describe('Hooks', () => {
    it('Should generate hooks for query and mutation', async () => {
      const documents = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }
        mutation submitRepository($name: String) {
          submitRepository(repoFullName: $name) {
            id
          }
        }
      `)
      const docs = [{ filePath: '', content: documents }]

      const content = (await plugin(
        schema,
        docs,
        { withHooks: true, withComponent: false, withHOC: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
export function useFeedQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<FeedQuery, FeedQueryVariables>) {
  return ApolloReactHooks.useQuery<FeedQuery, FeedQueryVariables>(FeedDocument, baseOptions);
}`)

      expect(content.content).toBeSimilarStringTo(`
export function useSubmitRepositoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SubmitRepositoryMutation, SubmitRepositoryMutationVariables>) {
  return ApolloReactHooks.useMutation<SubmitRepositoryMutation, SubmitRepositoryMutationVariables>(SubmitRepositoryDocument, baseOptions);
}`)
      validateFlow(content)
    })

    it('Should generate deduped hooks for query and mutation', async () => {
      const documents = parse(/* GraphQL */ `
        query FeedQuery {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }
        mutation SubmitRepositoryMutation($name: String) {
          submitRepository(repoFullName: $name) {
            id
          }
        }
      `)
      const docs = [{ filePath: '', content: documents }]

      const content = (await plugin(
        schema,
        docs,
        {
          withHooks: true,
          withComponent: false,
          withHOC: false,
          dedupeOperationSuffix: true
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
export function useFeedQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<FeedQuery, FeedQueryVariables>) {
  return ApolloReactHooks.useQuery<FeedQuery, FeedQueryVariables>(FeedQueryDocument, baseOptions);
}`)

      expect(content.content).toBeSimilarStringTo(`
export function useSubmitRepositoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SubmitRepositoryMutation, SubmitRepositoryMutationVariables>) {
  return ApolloReactHooks.useMutation<SubmitRepositoryMutation, SubmitRepositoryMutationVariables>(SubmitRepositoryMutationDocument, baseOptions);
}`)
      validateFlow(content)
    })

    it('Should not generate hooks for query and mutation', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withHooks: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toContain(`export function useTestQuery`)
      validateFlow(content)
    })

    it('Should generate subscription hooks', async () => {
      const documents = parse(/* GraphQL */ `
        subscription ListenToComments($name: String) {
          commentAdded(repoFullName: $name) {
            id
          }
        }
      `)

      const docs = [{ filePath: '', content: documents }]

      const content = (await plugin(
        schema,
        docs,
        {
          withHooks: true,
          withComponent: false,
          withHOC: false
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
export function useListenToCommentsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<ListenToCommentsSubscription, ListenToCommentsSubscriptionVariables>) {
  return ApolloReactHooks.useSubscription<ListenToCommentsSubscription, ListenToCommentsSubscriptionVariables>(ListenToCommentsDocument, baseOptions);
}`)
      validateFlow(content)
    })

    it('Should not add typesPrefix to hooks', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { withHooks: true, typesPrefix: 'I' },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toContain(`export function useTestQuery`)
      validateFlow(content)
    })

    it('should generate hook result', async () => {
      const documents = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }
        mutation submitRepository($name: String) {
          submitRepository(repoFullName: $name) {
            id
          }
        }
      `)
      const docs = [{ filePath: '', content: documents }]

      const content = (await plugin(
        schema,
        docs,
        { withHooks: true, withComponent: false, withHOC: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
      export type FeedQueryHookResult = ExtractReturnType<typeof useFeedQuery>;
      `)

      expect(content.content).toBeSimilarStringTo(`
      export type FeedLazyQueryHookResult = ExtractReturnType<typeof useFeedLazyQuery>;
      `)

      expect(content.content).toBeSimilarStringTo(`
      export type SubmitRepositoryMutationHookResult = ExtractReturnType<typeof useSubmitRepositoryMutation>;
      `)
      validateFlow(content)
    })
  })

  describe('ResultType', () => {
    const config: ReactApolloRawPluginConfig = {
      withHOC: false,
      withComponent: false,
      withHooks: false,
      withMutationFn: false,
      withResultType: true,
      withMutationOptionsType: false
    }

    const mutationDoc = parse(/* GraphQL */ `
      mutation test($name: String) {
        submitRepository(repoFullName: $name) {
          id
        }
      }
    `)

    const subscriptionDoc = parse(/* GraphQL */ `
      subscription test($name: String) {
        commentAdded(repoFullName: $name) {
          id
        }
      }
    `)

    it('should generate ResultType for Query if withResultType is true', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).toContain(
        `export type TestQueryResult = ApolloReactCommon.QueryResult<TestQuery, TestQueryVariables>;`
      )
      validateFlow(content)
    })

    it('should NOT generate ResultType for Query if withResultType is false', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { ...config, withResultType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).not.toContain(
        `export type TestQueryResult = ApolloReactCommon.QueryResult<TestQuery, TestQueryVariables>;`
      )
      validateFlow(content)
    })

    it('should generate ResultType for Mutation if withResultType is true', async () => {
      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).toContain(
        `export type TestMutationResult = ApolloReactCommon.MutationResult<TestMutation>;`
      )
      validateFlow(content)
    })

    it('should NOT generate ResultType for Mutation if withResultType is false', async () => {
      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config, withResultType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).not.toContain(
        `export type TestMutationResult = ApolloReactCommon.MutationResult<TestMutation>;`
      )
      validateFlow(content)
    })

    it('should generate ResultType for Subscription if withResultType is true', async () => {
      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).toContain(
        `export type TestSubscriptionResult = ApolloReactCommon.SubscriptionResult<TestSubscription>;`
      )

      validateFlow(content)
    })

    it('should NOT generate ResultType for Subscription if withResultType is false', async () => {
      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config, withResultType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).not.toContain(
        `export type TestSubscriptionResult = ApolloReactCommon.SubscriptionResult<TestSubscription>;`
      )

      validateFlow(content)
    })
    it('should generate lazy query hooks', async () => {
      const documents = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }
      `)
      const docs = [{ filePath: '', content: documents }]

      const content = (await plugin(
        schema,
        docs,
        { withHooks: true, withComponent: false, withHOC: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(`
  export function useFeedLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<FeedQuery, FeedQueryVariables>) {
    return ApolloReactHooks.useLazyQuery<FeedQuery, FeedQueryVariables>(FeedDocument, baseOptions);
  }`)
      validateFlow(content)
    })
  })

  describe('MutationOptions', () => {
    const config: ReactApolloRawPluginConfig = {
      withHOC: false,
      withComponent: false,
      withHooks: false,
      withMutationFn: false,
      withResultType: false,
      withMutationOptionsType: true
    }

    it('should generate MutationOptions for Mutation if withMutationOptionsType is true', async () => {
      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).toContain(
        `export type TestMutationOptions = ApolloReactCommon.BaseMutationOptions<TestMutation, TestMutationVariables>;`
      )
      validateFlow(content)
    })

    it('should NOT generate MutationOptions for Mutation if withMutationOptionsType is false', async () => {
      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config, withMutationOptionsType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from '@apollo/react-common';`
      )
      expect(content.content).not.toContain(
        `export type TestMutationOptions = ApolloReactCommon.BaseMutationOptions<TestMutation, TestMutationVariables>;`
      )
      validateFlow(content)
    })

    it('should NOT generate MutationOptions for Query if withMutationOptionsType is true', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from 'react-apollo';`
      )
      expect(content.content).not.toContain(
        `ApolloReactCommon.BaseMutationOptions`
      )
      validateFlow(content)
    })

    it('should NOT generate MutationOptions for Query if withMutationOptionsType is false', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        { ...config, withMutationOptionsType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from 'react-apollo';`
      )
      expect(content.content).not.toContain(
        `ApolloReactCommon.BaseMutationOptions`
      )
      validateFlow(content)
    })

    it('should NOT generate MutationOptions for Subscription if withMutationOptionsType is true', async () => {
      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from 'react-apollo';`
      )
      expect(content.content).not.toContain(
        `ApolloReactCommon.BaseMutationOptions`
      )
      validateFlow(content)
    })

    it('should NOT generate MutationOptions for Subscription if withMutationOptionsType is false', async () => {
      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(
        schema,
        docs,
        { ...config, withMutationOptionsType: false },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toContain(
        `import * as ApolloReactCommon from 'react-apollo';`
      )
      expect(content.content).not.toContain(
        `ApolloReactCommon.BaseMutationOptions`
      )
      validateFlow(content)
    })
  })

  describe('documentMode and importDocumentNodeExternallyFrom', () => {
    const multipleOperationDoc = parse(/* GraphQL */ `
      query testOne {
        feed {
          id
          commentCount
          repository {
            full_name
            html_url
            owner {
              avatar_url
            }
          }
        }
      }
      mutation testTwo($name: String) {
        submitRepository(repoFullName: $name) {
          id
        }
      }
      subscription testThree($name: String) {
        commentAdded(repoFullName: $name) {
          id
        }
      }
    `)

    it('should import DocumentNode when documentMode is "documentNode"', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          documentMode: DocumentMode.documentNode
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import { DocumentNode } from 'graphql';`
      )
      expect(content.prepend).not.toContain(`import gql from 'graphql-tag';`)
      validateFlow(content)
    })

    it('should generate Document variable when documentMode is "documentNode"', async () => {
      const docs = [{ filePath: '', content: basicDoc }]
      const content = (await plugin(
        schema,
        docs,
        {
          documentMode: DocumentMode.documentNode
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).toBeSimilarStringTo(
        `export const TestDocument: DocumentNode = {"kind":"Document","defin`
      )

      // For issue #1599 - make sure there are not `loc` properties
      expect(content.content).not.toContain(`loc":`)
      expect(content.content).not.toContain(`loc':`)
      validateFlow(content)
    })

    it('should NOT generate inline fragment docs for external mode: file with operation using inline fragment', async () => {
      const docs = [
        {
          filePath: '',
          content: parse(/* GraphQL */ `
            fragment feedFragment on Entry {
              id
              commentCount
            }
            query testOne {
              feed {
                ...feedFragment
              }
            }
          `)
        }
      ]
      const config = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx'
      }
      const content = (await plugin(
        schema,
        docs,
        { ...config },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toBeSimilarStringTo(
        `export const FeedFragmentFragmentDoc = gql`
      )
      validateFlow(content)
    })

    it('should NOT generate inline fragment docs for external mode: file with operation NOT using inline fragment', async () => {
      const docs = [
        {
          filePath: '',
          content: parse(/* GraphQL */ `
            fragment feedFragment on Entry {
              id
              commentCount
            }
            query testOne {
              feed {
                id
              }
            }
          `)
        }
      ]
      const config = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx'
      }
      const content = (await plugin(
        schema,
        docs,
        {
          ...config
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toBeSimilarStringTo(
        `export const FeedFragmentFragmentDoc = gql`
      )
      validateFlow(content)
    })

    it('should NOT generate inline fragment docs for external mode: file with just fragment', async () => {
      const docs = [
        {
          filePath: '',
          content: parse(/* GraphQL */ `
            fragment feedFragment on Entry {
              id
              commentCount
            }
          `)
        }
      ]
      const config = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx'
      }
      const content = (await plugin(
        schema,
        docs,
        {
          ...config
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.content).not.toBeSimilarStringTo(
        `export const FeedFragmentFragmentDoc = gql`
      )

      validateFlow(content)
    })

    it('should import Operations from one external file and use it in Query component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [{ filePath: '', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
        export const TestComponent = (props: TestComponentProps) => (
          <ApolloReactComponents.Query query={Operations.test} {...props} />
        );`)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in useQuery and useLazyQuery', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [{ filePath: '', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TestQuery, TestQueryVariables>) {
        return ApolloReactHooks.useQuery<TestQuery, TestQueryVariables>(Operations.test, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TestQuery, TestQueryVariables>) {
        return ApolloReactHooks.useLazyQuery<TestQuery, TestQueryVariables>(Operations.test, baseOptions);
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in withQuery', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [{ filePath: '', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestQuery,
        TestQueryVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withQuery<TProps, TestQuery, TestQueryVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in Mutation component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
        export const TestComponent = (props: TestComponentProps) => (
          <ApolloReactComponents.Mutation mutation={Operations.test} {...props} />
        );`)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in useMutation', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TestMutation, TestMutationVariables>) {
        return ApolloReactHooks.useMutation<TestMutation, TestMutationVariables>(Operations.test, baseOptions);
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in withMutation', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [{ filePath: '', content: mutationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestMutation,
        TestMutationVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withMutation<TProps, TestMutation, TestMutationVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in Subscription component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
        export const TestComponent = (props: TestComponentProps) => (
          <ApolloReactComponents.Subscription subscription={Operations.test} {...props} />
        );`)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in useSubscription', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<TestSubscription, TestSubscriptionVariables>) {
        return ApolloReactHooks.useSubscription<TestSubscription, TestSubscriptionVariables>(Operations.test, baseOptions);
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in withSubscription', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [{ filePath: '', content: subscriptionDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestSubscription,
        TestSubscriptionVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withSubscription<TProps, TestSubscription, TestSubscriptionVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in multiple components', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [{ filePath: '', content: multipleOperationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export const TestOneComponent = (props: TestOneComponentProps) => (
        <ApolloReactComponents.Query query={Operations.testOne} {...props} />
      );`)
      expect(content.content).toBeSimilarStringTo(`
        export const TestTwoComponent = (props: TestTwoComponentProps) => (
          <ApolloReactComponents.Mutation mutation={Operations.testTwo} {...props} />
        );`)
      expect(content.content).toBeSimilarStringTo(`
        export const TestThreeComponent = (props: TestThreeComponentProps) => (
          <ApolloReactComponents.Subscription subscription={Operations.testThree} {...props} />
        );`)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in multiple hooks', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [{ filePath: '', content: multipleOperationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestOneQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TestOneQuery, TestOneQueryVariables>) {
        return ApolloReactHooks.useQuery<TestOneQuery, TestOneQueryVariables>(Operations.testOne, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestOneLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TestOneQuery, TestOneQueryVariables>) {
        return ApolloReactHooks.useLazyQuery<TestOneQuery, TestOneQueryVariables>(Operations.testOne, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestTwoMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TestTwoMutation, TestTwoMutationVariables>) {
        return ApolloReactHooks.useMutation<TestTwoMutation, TestTwoMutationVariables>(Operations.testTwo, baseOptions);
      }
      `)

      expect(content.content).toBeSimilarStringTo(`
      export function useTestThreeSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<TestThreeSubscription, TestThreeSubscriptionVariables>) {
        return ApolloReactHooks.useSubscription<TestThreeSubscription, TestThreeSubscriptionVariables>(Operations.testThree, baseOptions);
      }`)
      validateFlow(content)
    })

    it('should import Operations from one external file and use it in multiple HOCs', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'path/to/documents.tsx',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [{ filePath: '', content: multipleOperationDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from 'path/to/documents';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTestOne<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestOneQuery,
        TestOneQueryVariables,
        TestOneProps<TChildProps>>) {
          return ApolloReactHoc.withQuery<TProps, TestOneQuery, TestOneQueryVariables, TestOneProps<TChildProps>>(Operations.testOne, {
            alias: 'testOne',
            ...operationOptions
          });
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function withTestTwo<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestTwoMutation,
        TestTwoMutationVariables,
        TestTwoProps<TChildProps>>) {
          return ApolloReactHoc.withMutation<TProps, TestTwoMutation, TestTwoMutationVariables, TestTwoProps<TChildProps>>(Operations.testTwo, {
            alias: 'testTwo',
            ...operationOptions
          });
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function withTestThree<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestThreeSubscription,
        TestThreeSubscriptionVariables,
        TestThreeProps<TChildProps>>) {
          return ApolloReactHoc.withSubscription<TProps, TestThreeSubscription, TestThreeSubscriptionVariables, TestThreeProps<TChildProps>>(Operations.testThree, {
            alias: 'testThree',
            ...operationOptions
          });
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from near operation file for Query component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [{ filePath: 'path/to/document.graphql', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
        export const TestComponent = (props: TestComponentProps) => (
          <ApolloReactComponents.Query query={Operations.test} {...props} />
        );`)
      validateFlow(content)
    })

    it('should import Operations from near operation file for useQuery and useLazyQuery', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [{ filePath: 'path/to/document.graphql', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TestQuery, TestQueryVariables>) {
        return ApolloReactHooks.useQuery<TestQuery, TestQueryVariables>(Operations.test, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TestQuery, TestQueryVariables>) {
        return ApolloReactHooks.useLazyQuery<TestQuery, TestQueryVariables>(Operations.test, baseOptions);
      }
      `)
      validateFlow(content)
    })

    it('should import Operations from near operation file for withQuery', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [{ filePath: 'path/to/document.graphql', content: basicDoc }]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestQuery,
        TestQueryVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withQuery<TProps, TestQuery, TestQueryVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }
      `)

      validateFlow(content)
    })

    it('should import Operations from near operation file for Mutation component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: mutationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export const TestComponent = (props: TestComponentProps) => (
        <ApolloReactComponents.Mutation mutation={Operations.test} {...props} />
      );`)

      validateFlow(content)
    })

    it('should import Operations from near operation file for useMutation', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: mutationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TestMutation, TestMutationVariables>) {
        return ApolloReactHooks.useMutation<TestMutation, TestMutationVariables>(Operations.test, baseOptions);
      }`)

      validateFlow(content)
    })

    it('should import Operations from near operation file for withMutation', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: mutationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestMutation,
        TestMutationVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withMutation<TProps, TestMutation, TestMutationVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }
      `)

      validateFlow(content)
    })

    it('should import Operations from near operation file for Subscription component', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: subscriptionDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export const TestComponent = (props: TestComponentProps) => (
        <ApolloReactComponents.Subscription subscription={Operations.test} {...props} />
      );`)

      validateFlow(content)
    })

    it('should import Operations from near operation file for useSubscription', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: subscriptionDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<TestSubscription, TestSubscriptionVariables>) {
        return ApolloReactHooks.useSubscription<TestSubscription, TestSubscriptionVariables>(Operations.test, baseOptions);
      }`)

      validateFlow(content)
    })

    it('should import Operations from near operation file for withSubscription', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: subscriptionDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTest<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestSubscription,
        TestSubscriptionVariables,
        TestProps<TChildProps>>) {
          return ApolloReactHoc.withSubscription<TProps, TestSubscription, TestSubscriptionVariables, TestProps<TChildProps>>(Operations.test, {
            alias: 'test',
            ...operationOptions
          });
      }`)

      validateFlow(content)
    })

    it('should import Operations from near operation file and use it in multiple components', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: true,
        withHooks: false,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: multipleOperationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.js'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export const TestOneComponent = (props: TestOneComponentProps) => (
        <ApolloReactComponents.Query query={Operations.testOne} {...props} />
      );`)
      expect(content.content).toBeSimilarStringTo(`
        export const TestTwoComponent = (props: TestTwoComponentProps) => (
          <ApolloReactComponents.Mutation mutation={Operations.testTwo} {...props} />
        );`)
      expect(content.content).toBeSimilarStringTo(`
        export const TestThreeComponent = (props: TestThreeComponentProps) => (
          <ApolloReactComponents.Subscription subscription={Operations.testThree} {...props} />
        );`)

      validateFlow(content)
    })

    it('should import Operations from near operation file and use it in multiple hooks', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: true,
        withHOC: false
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: multipleOperationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.tsx'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function useTestOneQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TestOneQuery, TestOneQueryVariables>) {
        return ApolloReactHooks.useQuery<TestOneQuery, TestOneQueryVariables>(Operations.testOne, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestOneLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TestOneQuery, TestOneQueryVariables>) {
        return ApolloReactHooks.useLazyQuery<TestOneQuery, TestOneQueryVariables>(Operations.testOne, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestTwoMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TestTwoMutation, TestTwoMutationVariables>) {
        return ApolloReactHooks.useMutation<TestTwoMutation, TestTwoMutationVariables>(Operations.testTwo, baseOptions);
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function useTestThreeSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<TestThreeSubscription, TestThreeSubscriptionVariables>) {
        return ApolloReactHooks.useSubscription<TestThreeSubscription, TestThreeSubscriptionVariables>(Operations.testThree, baseOptions);
      }`)

      validateFlow(content)
    })

    it('should import Operations from near operation file and use it in multiple HOCs', async () => {
      const config: ReactApolloRawPluginConfig = {
        documentMode: DocumentMode.external,
        importDocumentNodeExternallyFrom: 'near-operation-file',
        withComponent: false,
        withHooks: false,
        withHOC: true
      }

      const docs = [
        { filePath: 'path/to/document.graphql', content: multipleOperationDoc }
      ]

      const content = (await plugin(schema, docs, config, {
        outputFile: 'graphql.js'
      })) as Types.ComplexPluginOutput

      expect(content.prepend).toContain(
        `import * as Operations from './document.graphql';`
      )
      expect(content.content).toBeSimilarStringTo(`
      export function withTestOne<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestOneQuery,
        TestOneQueryVariables,
        TestOneProps<TChildProps>>) {
          return ApolloReactHoc.withQuery<TProps, TestOneQuery, TestOneQueryVariables, TestOneProps<TChildProps>>(Operations.testOne, {
            alias: 'testOne',
            ...operationOptions
          });
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function withTestTwo<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestTwoMutation,
        TestTwoMutationVariables,
        TestTwoProps<TChildProps>>) {
          return ApolloReactHoc.withMutation<TProps, TestTwoMutation, TestTwoMutationVariables, TestTwoProps<TChildProps>>(Operations.testTwo, {
            alias: 'testTwo',
            ...operationOptions
          });
      }
      `)
      expect(content.content).toBeSimilarStringTo(`
      export function withTestThree<TProps, TChildProps>(operationOptions?: ApolloReactHoc.OperationOption<
        TProps,
        TestThreeSubscription,
        TestThreeSubscriptionVariables,
        TestThreeProps<TChildProps>>) {
          return ApolloReactHoc.withSubscription<TProps, TestThreeSubscription, TestThreeSubscriptionVariables, TestThreeProps<TChildProps>>(Operations.testThree, {
            alias: 'testThree',
            ...operationOptions
          });
      }
      `)

      validateFlow(content)
    })

    it(`should NOT import Operations if no operation collected: external mode and one file`, async () => {
      const docs = [
        {
          filePath: 'path/to/document.graphql',
          content: parse(/* GraphQL */ `
            fragment feedFragment on Entry {
              id
              commentCount
            }
          `)
        }
      ]
      const content = (await plugin(
        schema,
        docs,
        {
          documentMode: DocumentMode.external,
          importDocumentNodeExternallyFrom: 'near-operation-file'
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toBeSimilarStringTo(`import * as Operations`)
      validateFlow(content)
    })

    it(`should NOT import Operations if no operation collected: external mode and multiple files`, async () => {
      const docs = [
        {
          filePath: 'a.graphql',
          content: parse(/* GraphQL */ `
            fragment feedFragment1 on Entry {
              id
              commentCount
            }
          `)
        },
        {
          filePath: 'b.graphql',
          content: parse(/* GraphQL */ `
            fragment feedFragment2 on Entry {
              id
              commentCount
            }
          `)
        }
      ]
      const content = (await plugin(
        schema,
        docs,
        {
          documentMode: DocumentMode.external,
          importDocumentNodeExternallyFrom: 'path/to/documents.tsx'
        },
        {
          outputFile: 'graphql.tsx'
        }
      )) as Types.ComplexPluginOutput

      expect(content.prepend).not.toBeSimilarStringTo(`import * as Operations`)
      validateFlow(content)
    })
  })
})
