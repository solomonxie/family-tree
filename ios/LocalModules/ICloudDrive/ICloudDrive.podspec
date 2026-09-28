Pod::Spec.new do |s|
  s.name         = 'ICloudDrive'
  s.version      = '1.0.0'
  s.summary      = 'Writes backup files into the app iCloud Drive container.'
  s.homepage     = 'https://example.invalid/family-tree'
  s.license      = 'MIT'
  s.author       = 'family-tree'
  s.platforms    = { :ios => '16.0' }
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.dependency 'React-Core'
end
