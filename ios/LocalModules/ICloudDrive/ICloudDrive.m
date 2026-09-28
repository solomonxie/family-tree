#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

static NSString *const kContainer = @"iCloud.com.solomonxie.familytree";

@interface ICloudDrive : NSObject <RCTBridgeModule>
@end

@implementation ICloudDrive

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return NO; }

- (dispatch_queue_t)methodQueue {
  return dispatch_queue_create("familytree.icloud", DISPATCH_QUEUE_SERIAL);
}

// Absent profile (App Store build) means entitled.
static BOOL BuildIsEntitled(void) {
  NSString *path = [[NSBundle mainBundle] pathForResource:@"embedded" ofType:@"mobileprovision"];
  if (!path) return YES;
  NSString *raw = [[NSString alloc] initWithData:[NSData dataWithContentsOfFile:path] encoding:NSISOLatin1StringEncoding];
  NSRange start = [raw rangeOfString:@"<?xml"];
  NSRange end = [raw rangeOfString:@"</plist>"];
  if (start.location == NSNotFound || end.location == NSNotFound) return NO;
  NSString *xml = [raw substringWithRange:NSMakeRange(start.location, NSMaxRange(end) - start.location)];
  NSDictionary *plist = [NSPropertyListSerialization propertyListWithData:[xml dataUsingEncoding:NSUTF8StringEncoding]
                                                                  options:0 format:nil error:nil];
  NSArray *containers = plist[@"Entitlements"][@"com.apple.developer.icloud-container-identifiers"];
  return [containers isKindOfClass:[NSArray class]] && containers.count > 0;
}

static NSURL *DocumentsURL(void) {
  NSURL *root = [[NSFileManager defaultManager] URLForUbiquityContainerIdentifier:kContainer];
  if (!root) return nil;
  NSURL *docs = [root URLByAppendingPathComponent:@"Documents" isDirectory:YES];
  [[NSFileManager defaultManager] createDirectoryAtURL:docs withIntermediateDirectories:YES attributes:nil error:nil];
  return docs;
}

// Order matters: the identity token reads nil in an unentitled build too.
RCT_EXPORT_METHOD(status:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (DocumentsURL()) return resolve(@"available");
  if (!BuildIsEntitled()) return resolve(@"notEntitled");
  if (![NSFileManager defaultManager].ubiquityIdentityToken) return resolve(@"driveOff");
  resolve(@"notReady");
}

RCT_EXPORT_METHOD(save:(NSString *)sourcePath name:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSURL *docs = DocumentsURL();
  if (!docs) return reject(@"unavailable", @"iCloud Drive isn't available.", nil);
  NSURL *dest = [docs URLByAppendingPathComponent:name];
  NSURL *src = [NSURL fileURLWithPath:sourcePath];
  __block NSError *err = nil;
  NSError *coordErr = nil;
  [[[NSFileCoordinator alloc] initWithFilePresenter:nil]
      coordinateWritingItemAtURL:dest options:NSFileCoordinatorWritingForReplacing error:&coordErr
                      byAccessor:^(NSURL *url) {
    NSFileManager *fm = [NSFileManager defaultManager];
    [fm removeItemAtURL:url error:nil];
    [fm copyItemAtURL:src toURL:url error:&err];
  }];
  NSError *failure = coordErr ?: err;
  if (failure) return reject(@"write_failed", failure.localizedDescription, failure);
  resolve(dest.path);
}

// {path, modified (ms), size, downloaded} or null. Starts a download when only the placeholder is here.
RCT_EXPORT_METHOD(fileInfo:(NSString *)name resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSURL *docs = DocumentsURL();
  if (!docs) return resolve([NSNull null]);
  NSURL *url = [docs URLByAppendingPathComponent:name];
  NSDictionary *values = [url resourceValuesForKeys:@[NSURLContentModificationDateKey, NSURLFileSizeKey,
                                                       NSURLUbiquitousItemDownloadingStatusKey] error:nil];
  BOOL exists = [[NSFileManager defaultManager] fileExistsAtPath:url.path];
  if (!values[NSURLUbiquitousItemDownloadingStatusKey] && !exists) return resolve([NSNull null]);
  BOOL downloaded = [values[NSURLUbiquitousItemDownloadingStatusKey] isEqualToString:NSURLUbiquitousItemDownloadingStatusCurrent] || exists;
  if (!downloaded) [[NSFileManager defaultManager] startDownloadingUbiquitousItemAtURL:url error:nil];
  NSDate *modified = values[NSURLContentModificationDateKey];
  resolve(@{
    @"path": url.path,
    @"modified": @(modified ? modified.timeIntervalSince1970 * 1000 : 0),
    @"size": values[NSURLFileSizeKey] ?: @0,
    @"downloaded": @(downloaded),
  });
}

@end
